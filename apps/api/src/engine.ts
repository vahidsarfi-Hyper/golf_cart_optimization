import {
  CEILING_KWH,
  FLOOR_KWH,
  PACK_KWH,
  REQUIRED_KWH,
  ROUND_KWH,
  STEP_HOURS,
  STEPS_PER_DAY,
  minuteLabel,
  type MeterTopology,
  type PeakTarget
} from "shared";
import { billMonth, energyRate, priceBand, tariffById, TARIFFS, type BillPoint } from "./tariffs.ts";

const ETA_C = 0.95;
const ETA_D = 0.95;
const ROUND_STEPS = 16;
const DEMO_DATE = "2026-07-15";
const WEAR_USD_PER_KWH = 0.15;

export const WORKING_NOTES = [
  "A round is 4 hours and 4.0 kWh. Readiness is 4.8 kWh, which is the round plus a 20% margin. The 1.2 kWh floor is not added on top, because that sum does not fit in a 6 kWh pack.",
  "Con Edison and FPL demand intervals are modeled as 15 minutes. The strategy still lists those intervals as unconfirmed.",
  "Customer charges are zero. The strategy extract does not list them. PG&E's part-peak window is omitted because the extract gives the price and not the hours.",
  "The demo service can take 400 kW. July 15 already has an anytime peak of 230 kW and a 4–9 PM peak of 190 kW on the books. The targets to defend are 250 kW and 210 kW.",
  "The plan is a look-ahead dispatcher: charge in the cheapest hours that stay under the peak target, and discharge the carts with the most spare energy. HiGHS is not bundled.",
  "Solar is a clear-sky curve. Clouds are not modeled."
];

type CartSeed = {
  id: string;
  label: string;
  soc: number;
  homePlugged: boolean;
  offline: boolean;
  roundIndex: number | null;
};

type Wave = { minute: number; cartIndexes: number[] };

type DayShape = {
  date: string;
  month: number;
  weekday: number;
  irrigation: number[];
  clubhouse: number[];
  solar: number[];
  carts: CartSeed[];
  waves: Wave[];
};

export type StepSide = {
  chargeKw: number;
  dischargeKw: number;
  importKw: number;
  onCourse: number;
  ready: number;
  short: number;
  spareKwh: number;
  netCartKw: number;
  intent: string;
  binding: string;
};

export type CartTrace = {
  soc: number[];
  charge: number[];
  discharge: number[];
  onRound: number[];
  hole: number[];
  plugged: number[];
};

export type CartView = {
  id: string;
  label: string;
  offline: boolean;
  homePlugged: boolean;
  teeMinute: number | null;
  unmanaged: CartTrace;
  plan: CartTrace;
};

export type DayPayload = {
  date: string;
  tariffId: string;
  tariffName: string;
  tariffSource: string;
  fixedNote: string;
  meter: MeterTopology;
  powerKw: number;
  solver: string;
  notes: string[];
  targets: { id: string; name: string; monthToDateKw: number; targetKw: number; usdPerKw: number }[];
  steps: {
    label: string;
    minute: number;
    irrigationKw: number;
    clubhouseKw: number;
    solarKw: number;
    priceCents: number;
    band: "peak" | "off-peak";
    unmanaged: StepSide;
    plan: StepSide;
  }[];
  carts: CartView[];
  rounds: { minute: number; label: string; carts: string[]; required: number }[];
  bills: { unmanaged: ReturnType<typeof billMonth> & { wearDollars: number }; plan: ReturnType<typeof billMonth> & { wearDollars: number } };
};

const CLUB = [32, 30, 28, 28, 28, 30, 48, 75, 100, 125, 140, 155, 165, 158, 175, 205, 245, 225, 165, 110, 75, 50, 40, 34];
const SOLAR = [0, 0, 0, 0, 0, 0, 8, 25, 50, 72, 88, 98, 100, 92, 78, 52, 26, 8, 0, 0, 0, 0, 0, 0];

function hold(hourly: number[], step: number): number {
  return hourly[Math.floor(step / 4)];
}

function irrigationAt(step: number): number {
  const minute = step * 15;
  if (minute === 60) return 280;
  if (minute === 240) return 200;
  if (minute === 6 * 60) return 40;
  if (minute > 6 * 60 && minute < 22 * 60) return 0;
  if (minute >= 23 * 60 || minute < 6 * 60) return 150;
  return 110;
}

function dateParts(date: string): { month: number; weekday: number } {
  const [year, month, day] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { month, weekday };
}

function buildShape(date: string, scale = { club: 1, solar: 1, rounds: 1 }): DayShape {
  const { month, weekday } = dateParts(date);
  const weekend = weekday === 0 || weekday === 6;
  const roundScale = scale.rounds * (weekend ? 0.55 : 1);
  const carts: CartSeed[] = [];
  for (let n = 1; n <= 75; n += 1) {
    const id = `c${n}`;
    const offline = n >= 74;
    const homePlugged = !offline && n < 70;
    carts.push({ id, label: `Cart ${n}`, soc: 4, homePlugged, offline, roundIndex: null });
  }
  const waves: Wave[] = [];
  const pool = carts.map((_, index) => index).filter((index) => carts[index].homePlugged);
  let cursor = 0;
  for (let minute = 7 * 60; minute <= 15 * 60 + 30; minute += 30) {
    if (roundScale < 0.7 && minute >= 12 * 60) continue;
    if (roundScale < 0.5 && minute % 60 !== 0) continue;
    const indexes: number[] = [];
    for (let k = 0; k < 3 && cursor < pool.length; k += 1) indexes.push(pool[cursor++]);
    if (minute === 10 * 60 + 30) {
      const short = carts.findIndex((cart) => cart.id === "c70");
      if (indexes.length > 0 && short >= 0) indexes[0] = short;
    }
    waves.push({ minute, cartIndexes: indexes });
  }
  waves.forEach((wave, waveIndex) => {
    for (const index of wave.cartIndexes) carts[index].roundIndex = waveIndex;
  });
  for (const cart of carts) {
    if (cart.offline) cart.soc = 1.5;
    else if (!cart.homePlugged) cart.soc = 2;
    else if (cart.roundIndex != null && waves[cart.roundIndex].minute < 12 * 60) cart.soc = 1.6;
    else cart.soc = 5.4;
  }
  return {
    date,
    month,
    weekday,
    irrigation: Array.from({ length: STEPS_PER_DAY }, (_, step) => round1(irrigationAt(step))),
    clubhouse: Array.from({ length: STEPS_PER_DAY }, (_, step) => round1(hold(CLUB, step) * scale.club * (weekend ? 0.8 : 1))),
    solar: Array.from({ length: STEPS_PER_DAY }, (_, step) => round1(hold(SOLAR, step) * scale.solar)),
    carts,
    waves
  };
}

type Runtime = {
  soc: number[][];
  charge: number[][];
  discharge: number[][];
  onRound: number[][];
  hole: number[][];
  plugged: number[][];
};

function emptyRuntime(count: number): Runtime {
  const column = () => Array.from({ length: STEPS_PER_DAY }, () => 0);
  return {
    soc: Array.from({ length: count }, column),
    charge: Array.from({ length: count }, column),
    discharge: Array.from({ length: count }, column),
    onRound: Array.from({ length: count }, column),
    hole: Array.from({ length: count }, column),
    plugged: Array.from({ length: count }, column)
  };
}

function teeOf(carts: CartSeed[], waves: Wave[], index: number): number | null {
  const roundIndex = carts[index].roundIndex;
  return roundIndex == null ? null : waves[roundIndex].minute;
}

function onRoundAt(carts: CartSeed[], waves: Wave[], index: number, minute: number): boolean {
  const tee = teeOf(carts, waves, index);
  if (tee == null) return false;
  return minute >= tee && minute < tee + ROUND_STEPS * 15;
}

function capFor(minute: number, targets: PeakTarget[], tariffId: string, month: number, weekday: number): number {
  const tariff = tariffById(tariffId);
  const sample = { date: DEMO_DATE, minute, month, weekday };
  let cap = 400;
  for (const window of tariff.windows) {
    const target = targets.find((item) => item.windowId === window.id);
    if (!target) continue;
    const active = window.months.length === 0 || window.months.includes(sample.month);
    const dayOk = window.weekdays.length === 0 || window.weekdays.includes(sample.weekday);
    const timeOk = window.startMinute === window.endMinute || (minute >= window.startMinute && minute < window.endMinute);
    if (active && dayOk && timeOk) cap = Math.min(cap, target.targetKw);
  }
  return cap;
}

function dispatchPlan(shape: DayShape, meter: MeterTopology, powerKw: number, targets: PeakTarget[], tariffId: string, linkLoss: string) {
  const count = shape.carts.length;
  const charge = Array.from({ length: count }, () => Array(STEPS_PER_DAY).fill(0));
  const prices = shape.clubhouse.map((_, step) => energyRate(tariffById(tariffId), { date: shape.date, minute: step * 15, month: shape.month, weekday: shape.weekday }));
  const base = shape.clubhouse.map((club, step) => club + (meter === "one" ? shape.irrigation[step] : 0) - shape.solar[step]);
  const order = shape.carts.map((_, index) => index).sort((a, b) => (teeOf(shape.carts, shape.waves, a) ?? 24 * 60) - (teeOf(shape.carts, shape.waves, b) ?? 24 * 60));
  const net = Array(STEPS_PER_DAY).fill(0);
  for (const index of order) {
    const cart = shape.carts[index];
    const tee = teeOf(shape.carts, shape.waves, index);
    if (cart.offline || tee == null) continue;
    let energy = cart.soc;
    const deadline = tee / 15;
    let need = Math.max(0, REQUIRED_KWH - energy);
    const slots = [];
    for (let step = 0; step < deadline; step += 1) {
      if (onRoundAt(shape.carts, shape.waves, index, step * 15)) continue;
      if (!cart.homePlugged) continue;
      slots.push(step);
    }
    const forced = cart.id === linkLoss;
    slots.sort((a, b) => (forced ? a - b : prices[a] - prices[b] || base[a] - base[b] || shape.solar[b] - shape.solar[a]));
    for (const step of slots) {
      if (need <= 0.05) break;
      const cap = capFor(step * 15, targets, tariffId, shape.month, shape.weekday);
      const room = cap - (base[step] + net[step]);
      if (room <= 0) continue;
      const kw = Math.min(powerKw, room, need / (ETA_C * STEP_HOURS));
      charge[index][step] = round2(kw);
      net[step] += kw;
      need -= kw * ETA_C * STEP_HOURS;
    }
  }
  return { charge, base };
}

function runForward(
  shape: DayShape,
  meter: MeterTopology,
  powerKw: number,
  targets: PeakTarget[],
  tariffId: string,
  mode: "unmanaged" | "plan",
  linkLoss: string,
  meterBlind: boolean
): { runtime: Runtime; sides: StepSide[] } {
  const plan = mode === "plan" ? dispatchPlan(shape, meter, powerKw, targets, tariffId, linkLoss) : null;
  const runtime = emptyRuntime(shape.carts.length);
  const soc = shape.carts.map((cart) => cart.soc);
  const discharged = shape.carts.map(() => 0);
  const sides: StepSide[] = [];
  for (let step = 0; step < STEPS_PER_DAY; step += 1) {
    const minute = step * 15;
    const base = shape.clubhouse[step] + (meter === "one" ? shape.irrigation[step] : 0) - shape.solar[step];
    let chargeSum = 0;
    let dischargeSum = 0;
    const onCourseIndexes: number[] = [];
    for (let index = 0; index < shape.carts.length; index += 1) {
      const cart = shape.carts[index];
      const playing = onRoundAt(shape.carts, shape.waves, index, minute);
      runtime.onRound[index][step] = playing ? 1 : 0;
      if (playing) {
        const progress = (minute - (teeOf(shape.carts, shape.waves, index) ?? minute)) / (ROUND_STEPS * 15);
        runtime.hole[index][step] = 1 + Math.min(17, Math.floor(progress * 18));
        soc[index] = Math.max(0, soc[index] - ROUND_KWH / ROUND_STEPS);
        onCourseIndexes.push(index);
      }
      const plugged = cart.homePlugged && !playing && !cart.offline;
      runtime.plugged[index][step] = plugged ? 1 : 0;
      if (mode === "unmanaged" && plugged) {
        const ceiling = ceilingFor(shape, index, minute);
        const room = Math.max(0, ceiling - soc[index]);
        const kw = Math.min(powerKw, room / (ETA_C * STEP_HOURS));
        runtime.charge[index][step] = round2(kw);
        soc[index] += kw * ETA_C * STEP_HOURS;
        chargeSum += kw;
      }
      if (mode === "plan" && plugged && plan) {
        const kw = plan.charge[index][step];
        const ceiling = ceilingFor(shape, index, minute);
        const room = Math.max(0, ceiling - soc[index]);
        const used = Math.min(kw, room / (ETA_C * STEP_HOURS));
        runtime.charge[index][step] = round2(used);
        soc[index] += used * ETA_C * STEP_HOURS;
        chargeSum += used;
      }
    }
    if (mode === "plan" && !meterBlind) {
      const cap = capFor(minute, targets, tariffId, shape.month, shape.weekday);
      let over = base + chargeSum - cap;
      if (over > 0.2) {
        const candidates = shape.carts
          .map((cart, index) => ({ cart, index, spare: spareKwh(shape, index, minute, soc[index], discharged[index]) }))
          .filter((item) => runtime.plugged[item.index][step] === 1 && item.cart.id !== linkLoss && item.spare > 0.05)
          .sort((a, b) => b.spare - a.spare || (teeOf(shape.carts, shape.waves, b.index) ?? 24 * 60) - (teeOf(shape.carts, shape.waves, a.index) ?? 24 * 60));
        if (candidates.length > 0) {
          const share = over / candidates.length;
          for (const item of candidates) {
            const kw = Math.min(powerKw, share, (item.spare * ETA_D) / STEP_HOURS, over);
            if (kw <= 0) continue;
            runtime.discharge[item.index][step] = round2(kw);
            soc[item.index] -= (kw * STEP_HOURS) / ETA_D;
            discharged[item.index] += kw * STEP_HOURS;
            dischargeSum += kw;
            over -= kw;
          }
        }
      }
    }
    let importKw = base + chargeSum - dischargeSum;
    if (importKw < 0) importKw = 0;
    for (let index = 0; index < shape.carts.length; index += 1) runtime.soc[index][step] = round2(soc[index]);
    sides.push(summarize(shape, runtime, step, chargeSum, dischargeSum, round1(importKw), onCourseIndexes.length, mode));
  }
  return { runtime, sides };
}

function ceilingFor(shape: DayShape, index: number, minute: number): number {
  const tee = teeOf(shape.carts, shape.waves, index);
  if (tee != null && tee - minute <= 60 && tee - minute >= 0) return PACK_KWH;
  return CEILING_KWH;
}

function spareKwh(shape: DayShape, index: number, minute: number, soc: number, dischargedKwh: number): number {
  if (dischargedKwh >= PACK_KWH) return 0;
  const tee = teeOf(shape.carts, shape.waves, index);
  const reserve = tee != null && tee >= minute ? REQUIRED_KWH : FLOOR_KWH;
  return Math.max(0, soc - reserve);
}

function summarize(shape: DayShape, runtime: Runtime, step: number, chargeSum: number, dischargeSum: number, importKw: number, onCourse: number, mode: "unmanaged" | "plan"): StepSide {
  const minute = step * 15;
  let ready = 0;
  let short = 0;
  let spare = 0;
  const nextWave = shape.waves.find((wave) => wave.minute > minute);
  for (let index = 0; index < shape.carts.length; index += 1) {
    const tee = teeOf(shape.carts, shape.waves, index);
    const soc = runtime.soc[index][step];
    if (tee != null && tee >= minute && runtime.onRound[index][step] === 0) {
      if (nextWave && tee === nextWave.minute) {
        if (soc + 0.05 >= REQUIRED_KWH) ready += 1;
        else short += 1;
      }
    }
    spare += Math.max(0, soc - (tee != null && tee >= minute ? REQUIRED_KWH : FLOOR_KWH));
  }
  const net = round1(chargeSum - dischargeSum);
  let binding = "none";
  let intent = mode === "unmanaged" ? "Plugged carts charge at full power until they are full." : "Holding the carts for their tee times.";
  if (mode === "plan" && dischargeSum > 1) {
    binding = "peak target";
    intent = minute >= 16 * 60 && minute < 21 * 60 ? "Discharging through the evening window to hold the peak target." : "Discharging through the pump spike so this interval stays on the target.";
  } else if (mode === "plan" && chargeSum > 1 && short > 0) {
    binding = "readiness";
    intent = "Charging the carts that are short for the next wave.";
  } else if (mode === "plan" && chargeSum > 1 && shape.solar[step] > 20) {
    intent = "Charging from midday solar, under the peak target.";
  } else if (mode === "plan" && chargeSum > 1) {
    binding = "import cap";
    intent = "Charging only while site import stays under the target.";
  }
  return {
    chargeKw: round1(chargeSum),
    dischargeKw: round1(dischargeSum),
    importKw,
    onCourse,
    ready,
    short,
    spareKwh: round1(spare),
    netCartKw: net,
    intent,
    binding
  };
}

const DEMO_TARGETS: PeakTarget[] = [
  { windowId: "anytime", monthToDateKw: 230, targetKw: 250 },
  { windowId: "summer-peak", monthToDateKw: 190, targetKw: 210 }
];

export function buildDay(meter: MeterTopology, powerKw: number, linkLoss = "", meterBlind = false): DayPayload {
  const shape = buildShape(DEMO_DATE);
  const tariff = tariffById("pge-b19");
  const unmanaged = runForward(shape, meter, powerKw, DEMO_TARGETS, "pge-b19", "unmanaged", "", false);
  const plan = runForward(shape, meter, powerKw, DEMO_TARGETS, "pge-b19", "plan", linkLoss, meterBlind);
  const points = (sides: StepSide[]): BillPoint[] =>
    sides.map((side, step) => ({
      date: shape.date,
      minute: step * 15,
      month: shape.month,
      weekday: shape.weekday,
      importKw: side.importKw,
      exportKw: 0
    }));
  const withWear = (mode: "unmanaged" | "plan", runtime: Runtime) => {
    const bill = billMonth(tariff, points(mode === "unmanaged" ? unmanaged.sides : plan.sides), DEMO_TARGETS);
    const wearKwh = runtime.discharge.reduce((sum, row) => sum + row.reduce((inner, kw) => inner + kw, 0) * STEP_HOURS, 0);
    const wearDollars = round2(wearKwh * WEAR_USD_PER_KWH);
    return { ...bill, wearDollars, totalDollars: round2(bill.totalDollars + wearDollars) };
  };
  return {
    date: shape.date,
    tariffId: tariff.id,
    tariffName: tariff.name,
    tariffSource: tariff.source,
    fixedNote: tariff.fixedNote,
    meter,
    powerKw,
    solver: "look-ahead dispatch, then spare-energy discharge. Assignment is the fixed tee sheet. HiGHS is not bundled.",
    notes: WORKING_NOTES,
    targets: tariff.windows
      .filter((window) => DEMO_TARGETS.some((target) => target.windowId === window.id))
      .map((window) => {
        const target = DEMO_TARGETS.find((item) => item.windowId === window.id)!;
        return { id: window.id, name: window.name, monthToDateKw: target.monthToDateKw, targetKw: target.targetKw, usdPerKw: window.usdPerKw };
      }),
    steps: unmanaged.sides.map((side, step) => ({
      label: minuteLabel(step * 15),
      minute: step * 15,
      irrigationKw: shape.irrigation[step],
      clubhouseKw: shape.clubhouse[step],
      solarKw: shape.solar[step],
      priceCents: Math.round(energyRate(tariff, { date: shape.date, minute: step * 15, month: shape.month, weekday: shape.weekday }) * 1000) / 10,
      band: priceBand(energyRate(tariff, { date: shape.date, minute: step * 15, month: shape.month, weekday: shape.weekday }) * 100),
      unmanaged: side,
      plan: plan.sides[step]
    })),
    carts: shape.carts.map((cart, index) => ({
      id: cart.id,
      label: cart.label,
      offline: cart.offline,
      homePlugged: cart.homePlugged,
      teeMinute: teeOf(shape.carts, shape.waves, index),
      unmanaged: traceOf(unmanaged.runtime, index),
      plan: traceOf(plan.runtime, index)
    })),
    rounds: shape.waves.map((wave) => ({
      minute: wave.minute,
      label: minuteLabel(wave.minute),
      carts: wave.cartIndexes.map((index) => shape.carts[index].label),
      required: wave.cartIndexes.length
    })),
    bills: { unmanaged: withWear("unmanaged", unmanaged.runtime), plan: withWear("plan", plan.runtime) }
  };
}

function traceOf(runtime: Runtime, index: number): CartTrace {
  return {
    soc: runtime.soc[index].map((_, step) => runtime.soc[index][step]),
    charge: runtime.charge[index],
    discharge: runtime.discharge[index],
    onRound: runtime.onRound[index],
    hole: runtime.hole[index],
    plugged: runtime.plugged[index]
  };
}

export function sendNext(day: DayPayload, policy: "unmanaged" | "plan", step: number, priorityRule: boolean) {
  const rows = day.carts
    .map((cart) => {
      const trace = cart[policy];
      const soc = trace.soc[step];
      const onRound = trace.onRound[step] === 1;
      const shortfall = cart.teeMinute != null && cart.teeMinute >= step * 15 && !onRound ? Math.max(0, REQUIRED_KWH - soc) : 0;
      return { id: cart.id, label: cart.label, soc, percent: Math.round((soc / PACK_KWH) * 100), teeMinute: cart.teeMinute, shortfall, onRound, offline: cart.offline };
    })
    .filter((row) => !row.onRound && !row.offline && row.teeMinute != null);
  rows.sort((a, b) => {
    if (priorityRule) return b.percent - a.percent;
    return b.shortfall - a.shortfall || (a.teeMinute ?? 0) - (b.teeMinute ?? 0);
  });
  return rows.slice(0, 5);
}

export function dischargeNext(day: DayPayload, step: number) {
  return day.carts
    .map((cart) => {
      const trace = cart.plan;
      const soc = trace.soc[step];
      const reserve = cart.teeMinute != null && cart.teeMinute >= step * 15 ? REQUIRED_KWH : FLOOR_KWH;
      return { id: cart.id, label: cart.label, spare: soc - reserve, teeMinute: cart.teeMinute, plugged: trace.plugged[step] === 1 };
    })
    .filter((row) => row.plugged && row.spare > 0.2)
    .sort((a, b) => b.spare - a.spare || (b.teeMinute ?? 0) - (a.teeMinute ?? 0))
    .slice(0, 3);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SOLAR_SCALE = [0.45, 0.55, 0.7, 0.85, 0.95, 1, 1, 0.95, 0.8, 0.65, 0.5, 0.42];
const CLUB_SCALE = [0.6, 0.62, 0.7, 0.8, 0.9, 1, 1, 1, 0.9, 0.75, 0.65, 0.6];

function monthDates(year: number, month: number): string[] {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: days }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${year}-${String(month).padStart(2, "0")}-${day}`;
  });
}

function utilityBill(tariffId: string, points: BillPoint[]) {
  const tariff = tariffById(tariffId);
  const zeros: PeakTarget[] = tariff.windows.map((window) => ({ windowId: window.id, monthToDateKw: 0, targetKw: 0 }));
  return billMonth(tariff, points, zeros);
}

export function valueYear(tariffId: string, meter: MeterTopology, powerKw: number, uploaded?: { minute: number; month: number; weekday: number; date: string; nonCartKw: number }[]) {
  const months = MONTHS.map((name, index) => {
    const month = index + 1;
    const dates = monthDates(2026, month);
    const unmanaged: BillPoint[] = [];
    const plan: BillPoint[] = [];
    let wear = 0;
    if (uploaded) {
      const mine = uploaded.filter((row) => row.month === month);
      const unmanagedKw = mine.map((row) => row.nonCartKw);
      const planKw = mine.map((row) => Math.max(0, row.nonCartKw - Math.min(powerKw * 20, Math.max(0, row.nonCartKw - 180))));
      mine.forEach((row, step) => {
        unmanaged.push({ ...row, importKw: unmanagedKw[step], exportKw: 0 });
        plan.push({ ...row, importKw: planKw[step], exportKw: 0 });
      });
    } else {
      for (const date of dates) {
        const shape = buildShape(date, { club: CLUB_SCALE[month - 1], solar: SOLAR_SCALE[month - 1], rounds: month >= 11 || month <= 2 ? 0.45 : 1 });
        const targets = targetsFor(shape, tariffId);
        const rawUnmanaged = runForward(shape, meter, powerKw, targets, tariffId, "unmanaged", "", false);
        const rawPlan = runForward(shape, meter, powerKw, targets, tariffId, "plan", "", false);
        rawUnmanaged.sides.forEach((side, step) => unmanaged.push(point(shape, step, side.importKw)));
        rawPlan.sides.forEach((side, step) => plan.push(point(shape, step, side.importKw)));
        wear += rawPlan.runtime.discharge.reduce((sum, row) => sum + row.reduce((inner, kw) => inner + kw, 0), 0) * STEP_HOURS * WEAR_USD_PER_KWH;
      }
    }
    const before = utilityBill(tariffId, unmanaged);
    const after = utilityBill(tariffId, plan);
    const ranked = unmanaged.map((row) => row.importKw).sort((a, b) => b - a);
    return { name, before: before.totalDollars, after: round2(after.totalDollars + wear), difference: round2(before.totalDollars - after.totalDollars - wear), ranked: quantiles(ranked, 48) };
  });
  const year = round2(months.reduce((sum, month) => sum + month.difference, 0));
  const typical = [...months].sort((a, b) => a.difference - b.difference)[Math.floor(months.length / 2)];
  const high = [...months].sort((a, b) => b.difference - a.difference)[0];
  const duration = quantiles(months.flatMap((month) => month.ranked), 64);
  const fleetKw = round1(75 * powerKw);
  const usableKwh = 75 * (CEILING_KWH - FLOOR_KWH);
  return {
    year,
    typical: { name: typical.name, dollars: typical.difference },
    high: { name: high.name, dollars: high.difference },
    months: months.map(({ name, difference }) => ({ name, difference })),
    duration,
    fleetKw,
    coverHours: round1(usableKwh / fleetKw),
    usableKwh
  };
}

function targetsFor(shape: DayShape, tariffId: string): PeakTarget[] {
  const tariff = tariffById(tariffId);
  return tariff.windows.map((window) => {
    const values = shape.clubhouse.map((club, step) => {
      const minute = step * 15;
      const sample = { date: shape.date, minute, month: shape.month, weekday: shape.weekday };
      const base = club + shape.irrigation[step] - shape.solar[step];
      const inWindow = window.months.length === 0 || window.months.includes(sample.month);
      return inWindow ? base : 0;
    });
    const peak = Math.max(...values);
    return { windowId: window.id, monthToDateKw: 0, targetKw: Math.max(80, round1(peak * 0.82)) };
  });
}

function point(shape: DayShape, step: number, importKw: number): BillPoint {
  return { date: shape.date, minute: step * 15, month: shape.month, weekday: shape.weekday, importKw, exportKw: 0 };
}

function quantiles(values: number[], count: number): number[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => b - a);
  return Array.from({ length: count }, (_, index) => sorted[Math.min(sorted.length - 1, Math.floor((index / (count - 1)) * (sorted.length - 1)))]);
}

export function sampleYearCsv(): string {
  const lines = ["date,minute,nonCartKw"];
  for (let month = 1; month <= 12; month += 1) {
    for (const date of monthDates(2026, month)) {
      const shape = buildShape(date, { club: CLUB_SCALE[month - 1], solar: SOLAR_SCALE[month - 1], rounds: 1 });
      for (let step = 0; step < STEPS_PER_DAY; step += 4) {
        const nonCart = round1(shape.clubhouse[step] + shape.irrigation[step] - shape.solar[step]);
        lines.push(`${date},${step * 15},${nonCart}`);
      }
    }
  }
  return lines.join("\n");
}

export { DEMO_DATE, TARIFFS, buildShape };

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
