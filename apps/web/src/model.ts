import { PACK_KWH, REQUIRED_KWH } from "shared";

export type Policy = "unmanaged" | "plan";
export type Meter = "one" | "pump";

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

export type DayCart = {
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
  meter: Meter;
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
  carts: DayCart[];
  rounds: { minute: number; label: string; carts: string[]; required: number }[];
  bills: {
    unmanaged: Bill;
    plan: Bill;
  };
};

export type Bill = {
  energyDollars: number;
  fixedDollars: number;
  wearDollars: number;
  totalDollars: number;
  windows: {
    id: string;
    name: string;
    usdPerKw: number;
    monthToDateKw: number;
    targetKw: number;
    peakKw: number;
    dollarsAboveTarget: number;
  }[];
};

export function usd(amount: number): string {
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function teeLabel(minute: number | null): string {
  if (minute == null) return "No tee";
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export function sendNext(day: DayPayload, policy: Policy, step: number, priorityRule: boolean) {
  const minute = day.steps[step]?.minute ?? 0;
  const rows = day.carts
    .map((cart) => {
      const trace = cart[policy];
      const soc = trace.soc[step] ?? 0;
      const onRound = trace.onRound[step] === 1;
      const shortfall = cart.teeMinute != null && cart.teeMinute >= minute && !onRound ? Math.max(0, REQUIRED_KWH - soc) : 0;
      return {
        id: cart.id,
        label: cart.label,
        percent: Math.round((soc / PACK_KWH) * 100),
        tee: teeLabel(cart.teeMinute),
        teeMinute: cart.teeMinute ?? 24 * 60,
        spare: `${Math.max(0, soc - (cart.teeMinute != null ? REQUIRED_KWH : 1.2)).toFixed(1)} kWh`,
        shortfall,
        short: shortfall > 0.05
      };
    })
    .filter((row) => day.carts.find((cart) => cart.id === row.id)?.teeMinute != null)
    .filter((row) => {
      const cart = day.carts.find((item) => item.id === row.id)!;
      return cart[policy].onRound[step] !== 1 && !cart.offline;
    });
  rows.sort((a, b) => (priorityRule ? b.percent - a.percent : b.shortfall - a.shortfall || a.teeMinute - b.teeMinute));
  return rows.slice(0, 5);
}
