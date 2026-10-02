import type { Cart, CartStatus } from "shared";
import { LOW_BATTERY_THRESHOLD } from "shared";

export const SLOT_MINUTES = 10;
export const PACK_KWH = 6;
export const FLEET_CARTS = 12;
export const PLANT_RATING_KW = 100;
export const PANELS_PRODUCING = 48;
export const PANELS_TOTAL = 48;
export const CHARGER_KW = 1.5;
export const DRIVE_KW = 1.2;
export const ROUND_HOURS = 2;
export const ROUND_KWH = DRIVE_KW * ROUND_HOURS;

const PACK = 600;
const CHARGE_STEP = 25;
const DRIVE_STEP = 20;
const ROUND_HUNDREDTHS = 240;
const START = 6 * 60;
const NOW = 10 * 60;
const END = 18 * 60;

export const LOW_CAPACITY_KWH = (FLEET_CARTS * PACK * (LOW_BATTERY_THRESHOLD / 100)) / 100;

export type PriceBand = "Cheap" | "Typical" | "Expensive";
export type Flow = "Net charging" | "Net draining" | "Holding";

export type EnergySample = {
  minute: number;
  label: string;
  solarKw: number;
  capacityKwh: number;
  capacityHundredths: number;
  demandKw: number;
  driveKw: number;
  priceCents: number;
  tripsStarting: number;
  cartsNeeded: number;
  tripKwh: number;
  chargeHundredths: number;
  driveHundredths: number;
};

export type MorningRound = {
  cartId: string;
  cartLabel: string;
  hole: number | null;
  tee: string;
  back: string;
  kwh: number;
  onCourse: boolean;
};

type Round = { start: number; end: number; hole: number | null };
type CartDef = {
  id: number;
  label: string;
  offline: boolean;
  base: "charger" | "available";
  initial: number;
  rounds: Round[];
  position: { x: number; y: number };
};

const CARTS: CartDef[] = [
  { id: 1, label: "Cart 1", offline: false, base: "charger", initial: 500, position: { x: 12, y: 78 }, rounds: [{ start: 6 * 60 + 30, end: 8 * 60 + 30, hole: null }, { start: 15 * 60, end: 17 * 60, hole: null }] },
  { id: 2, label: "Cart 2", offline: false, base: "charger", initial: 480, position: { x: 38, y: 42 }, rounds: [{ start: 9 * 60, end: 11 * 60, hole: 4 }] },
  { id: 3, label: "Cart 3", offline: false, base: "charger", initial: 520, position: { x: 62, y: 28 }, rounds: [{ start: 8 * 60 + 30, end: 10 * 60 + 30, hole: 11 }] },
  { id: 4, label: "Cart 4", offline: false, base: "charger", initial: 450, position: { x: 16, y: 84 }, rounds: [{ start: 7 * 60, end: 9 * 60, hole: null }, { start: 16 * 60, end: 18 * 60, hole: null }] },
  { id: 5, label: "Cart 5", offline: false, base: "available", initial: 510, position: { x: 22, y: 72 }, rounds: [{ start: 12 * 60, end: 14 * 60, hole: null }] },
  { id: 6, label: "Cart 6", offline: false, base: "charger", initial: 540, position: { x: 48, y: 55 }, rounds: [{ start: 9 * 60 + 30, end: 11 * 60 + 30, hole: 7 }] },
  { id: 7, label: "Cart 7", offline: false, base: "charger", initial: 180, position: { x: 8, y: 88 }, rounds: [{ start: 14 * 60, end: 16 * 60, hole: null }] },
  { id: 8, label: "Cart 8", offline: false, base: "charger", initial: 500, position: { x: 78, y: 36 }, rounds: [{ start: 8 * 60 + 30, end: 10 * 60 + 30, hole: 16 }] },
  { id: 9, label: "Cart 9", offline: false, base: "available", initial: 420, position: { x: 28, y: 80 }, rounds: [{ start: 13 * 60, end: 15 * 60, hole: null }] },
  { id: 10, label: "Cart 10", offline: true, base: "available", initial: 0, position: { x: 88, y: 18 }, rounds: [] },
  { id: 11, label: "Cart 11", offline: false, base: "charger", initial: 480, position: { x: 34, y: 22 }, rounds: [{ start: 9 * 60, end: 11 * 60, hole: 2 }] },
  { id: 12, label: "Cart 12", offline: false, base: "charger", initial: 360, position: { x: 14, y: 91 }, rounds: [{ start: 7 * 60 + 30, end: 9 * 60 + 30, hole: null }, { start: 11 * 60, end: 13 * 60, hole: null }] }
];

export function formatClock(minute: number): string {
  const hour24 = Math.floor(minute / 60);
  const mins = minute % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${mins.toString().padStart(2, "0")} ${suffix}`;
}

export function formatKwh(hundredths: number): string {
  return (hundredths / 100).toFixed(2);
}

export function formatSolarKw(kw: number): string {
  return kw.toFixed(1);
}

export function formatChargerKw(kw: number): string {
  return kw.toFixed(2);
}

export function priceBand(cents: number): PriceBand {
  if (cents < 12) return "Cheap";
  if (cents >= 22) return "Expensive";
  return "Typical";
}

function priceCents(minute: number): number {
  const hour = minute / 60;
  if (hour < 9) return 9;
  if (hour < 12) return 15;
  if (hour < 17) return 28;
  return 16;
}

function solarKwAt(minute: number): number {
  const hour = minute / 60;
  if (hour <= 6 || hour >= 19) return 0;
  return Math.round(PLANT_RATING_KW * Math.sin((Math.PI * (hour - 6)) / 13) * 10) / 10;
}

function roundAt(cart: CartDef, minute: number): Round | undefined {
  return cart.rounds.find((round) => minute >= round.start && minute < round.end);
}

function plugged(cart: CartDef, minute: number): boolean {
  if (cart.offline || roundAt(cart, minute)) return false;
  if (cart.base === "charger") return true;
  return cart.rounds.some((round) => round.end <= minute);
}

function tenAmIso(): string {
  const stamp = new Date();
  stamp.setHours(10, 0, 0, 0);
  return stamp.toISOString();
}

function buildDay(): { samples: EnergySample[]; teeSoc: Map<string, number> } {
  const soc = CARTS.map((cart) => cart.initial);
  const teeSoc = new Map<string, number>();
  const samples: EnergySample[] = [];

  for (let minute = START; minute <= END; minute += SLOT_MINUTES) {
    CARTS.forEach((cart, index) => {
      const round = roundAt(cart, minute);
      if (round && minute === round.start) teeSoc.set(`${cart.id}-${round.start}`, soc[index]);
    });

    const starts = CARTS.filter((cart) => cart.rounds.some((round) => round.start === minute));
    let chargeHundredths = 0;
    let driveHundredths = 0;
    const next = soc.slice();

    if (minute < END) {
      CARTS.forEach((cart, index) => {
        if (cart.offline) return;
        if (roundAt(cart, minute)) {
          const used = Math.min(DRIVE_STEP, next[index]);
          next[index] -= used;
          driveHundredths += used;
          return;
        }
        if (!plugged(cart, minute)) return;
        const added = Math.min(CHARGE_STEP, PACK - next[index]);
        next[index] += added;
        chargeHundredths += added;
      });
    }

    const driveKw = minute < END ? (driveHundredths * 6) / 100 : CARTS.filter((cart) => roundAt(cart, minute)).length * DRIVE_KW;
    const demandKw =
      minute < END
        ? (chargeHundredths * 6) / 100
        : CARTS.filter((cart, index) => plugged(cart, minute) && soc[index] < PACK).length * CHARGER_KW;

    samples.push({
      minute,
      label: formatClock(minute),
      solarKw: solarKwAt(minute),
      capacityHundredths: soc.reduce((sum, value) => sum + value, 0),
      capacityKwh: soc.reduce((sum, value) => sum + value, 0) / 100,
      demandKw,
      driveKw,
      priceCents: priceCents(minute),
      tripsStarting: starts.length,
      cartsNeeded: starts.length,
      tripKwh: (starts.length * ROUND_HUNDREDTHS) / 100,
      chargeHundredths,
      driveHundredths
    });

    if (minute < END) {
      soc.splice(0, soc.length, ...next);
    }
  }

  return { samples, teeSoc };
}

function socAtMinute(): number[] {
  const replay = CARTS.map((cart) => cart.initial);
  for (let minute = START; minute <= NOW; minute += SLOT_MINUTES) {
    if (minute === NOW) return replay.slice();
    CARTS.forEach((cart, index) => {
      if (cart.offline) return;
      if (roundAt(cart, minute)) {
        replay[index] = Math.max(0, replay[index] - DRIVE_STEP);
        return;
      }
      if (!plugged(cart, minute)) return;
      replay[index] = Math.min(PACK, replay[index] + CHARGE_STEP);
    });
  }
  return replay;
}

const built = buildDay();
const socNow = socAtMinute();

export const daySamples = built.samples;
export const historySamples = daySamples.filter((sample) => sample.minute <= NOW);
export const forecastSamples = daySamples.filter((sample) => sample.minute >= NOW);
export const nowSample = historySamples[historySamples.length - 1];

export const HISTORY_CAPTION = "6:00 AM – 10:00 AM · every 10 minutes · prototype clock, current time 10:00 AM";
export const FORECAST_CAPTION = "10:00 AM – 6:00 PM · every 10 minutes · prototype clock, current time 10:00 AM";

export function energyFromSolar(samples: EnergySample[]): number {
  const kwh = samples.slice(0, -1).reduce((sum, sample) => sum + sample.solarKw, 0) * (SLOT_MINUTES / 60);
  return Math.round(kwh * 100) / 100;
}

export function flowAt(chargeKw: number, driveKw: number): Flow {
  const net = chargeKw - driveKw;
  if (net > 0.05) return "Net charging";
  if (net < -0.05) return "Net draining";
  return "Holding";
}

export function isUnderLow(kwh: number): boolean {
  return kwh <= LOW_CAPACITY_KWH + 0.001;
}

function hundredthsBetween(samples: EnergySample[], field: "chargeHundredths" | "driveHundredths"): number {
  return samples.slice(0, -1).reduce((sum, sample) => sum + sample[field], 0);
}

export function balanceSentence(samples: EnergySample[], from: string, to: string): string {
  const charge = hundredthsBetween(samples, "chargeHundredths");
  const drive = hundredthsBetween(samples, "driveHundredths");
  const start = samples[0]?.capacityHundredths ?? 0;
  const end = samples[samples.length - 1]?.capacityHundredths ?? 0;
  return `From ${from} to ${to} the chargers deliver ${formatKwh(charge)} kWh and the rounds use ${formatKwh(drive)} kWh. Stored energy goes from ${formatKwh(start)} kWh to ${formatKwh(end)} kWh (${formatKwh(end)} − ${formatKwh(start)} = ${formatKwh(charge)} − ${formatKwh(drive)}).`;
}

export const solarHistoryKwh = energyFromSolar(historySamples);
export const solarForecastKwh = energyFromSolar(forecastSamples);
export const historyBalance = balanceSentence(historySamples, "6:00 AM", "10:00 AM");
export const forecastBalance = balanceSentence(forecastSamples, "10:00 AM", "6:00 PM");

export const fleetFlowNow: Flow = flowAt(nowSample.demandKw, nowSample.driveKw);

export const carts: Cart[] = CARTS.map((cart, index) => {
  const round = roundAt(cart, NOW);
  const onCharger = plugged(cart, NOW);
  let status: CartStatus = "available";
  if (cart.offline) status = "offline";
  else if (round) status = "in_use";
  else if (onCharger) status = "charging";
  return {
    id: `c${cart.id}`,
    label: cart.label,
    batteryPercent: Math.round((socNow[index] / 6) * 10) / 10,
    powerConnected: onCharger,
    status,
    hole: round?.hole ?? null,
    position: cart.position,
    lastUpdated: tenAmIso()
  };
});

export const cartEnergy = CARTS.map((cart, index) => ({
  id: `c${cart.id}`,
  label: cart.label,
  hundredths: socNow[index],
  kwh: formatKwh(socNow[index]),
  percent: (Math.round((socNow[index] / 6) * 10) / 10).toString(),
  charger: cart.offline ? "No signal" : roundAt(cart, NOW) ? "Unplugged" : plugged(cart, NOW) ? "On charger" : "Unplugged"
}));

function usedHundredths(cart: CartDef, round: Round): number {
  const startSoc = built.teeSoc.get(`${cart.id}-${round.start}`);
  if (startSoc === undefined) return 0;
  const endMinute = Math.min(round.end, NOW);
  if (endMinute <= round.start) return 0;
  const steps = (endMinute - round.start) / SLOT_MINUTES;
  return Math.min(startSoc, steps * DRIVE_STEP);
}

export const morningRounds: MorningRound[] = CARTS.flatMap((cart) =>
  cart.rounds
    .filter((round) => round.start < NOW && round.end > START)
    .map((round) => ({
      cartId: `c${cart.id}`,
      cartLabel: cart.label,
      hole: round.hole,
      tee: formatClock(round.start),
      back: formatClock(round.end),
      kwh: usedHundredths(cart, round) / 100,
      onCourse: Boolean(roundAt(cart, NOW))
    }))
);

export const roundsOnCourse = morningRounds.filter((round) => round.onCourse);

export const forecastTripHundredths = forecastSamples.reduce((sum, sample) => sum + Math.round(sample.tripKwh * 100), 0);

export function forecastHeadlines(samples: EnergySample[]): {
  solar: string;
  capacity: string;
  demand: string;
  trips: string;
} {
  const end = samples[samples.length - 1];
  const peakKw = samples.reduce((max, sample) => Math.max(max, sample.demandKw), 0);
  const highPrice = samples.reduce((max, sample) => Math.max(max, sample.priceCents), 0);
  const tripHundredths = samples.reduce((sum, sample) => sum + Math.round(sample.tripKwh * 100), 0);
  return {
    solar: `${solarForecastKwh.toFixed(2)} kWh to 6:00 PM`,
    capacity: end ? `${formatKwh(end.capacityHundredths)} kWh at 6:00 PM` : "—",
    demand: `${formatChargerKw(peakKw)} kW peak · ${highPrice}¢ high`,
    trips: `${formatKwh(tripHundredths)} kWh to 6:00 PM`
  };
}

export const headlines = forecastHeadlines(forecastSamples);

export function chargerCountNow(): number {
  return CARTS.filter((cart, index) => plugged(cart, NOW) && socNow[index] < PACK).length;
}
