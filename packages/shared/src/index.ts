export type CartStatus = "available" | "in_use" | "charging" | "offline";

export type Cart = {
  id: string;
  label: string;
  batteryPercent: number;
  powerConnected: boolean;
  status: CartStatus;
  hole: number | null;
  position: { x: number; y: number };
  lastUpdated: string;
};

export const LOW_BATTERY_THRESHOLD = 20;

export function isLowBattery(cart: Cart): boolean {
  return cart.batteryPercent <= LOW_BATTERY_THRESHOLD;
}

export function powerLabel(cart: Cart): string {
  if (cart.status === "offline") return "No signal";
  if (cart.powerConnected) return "Plugged";
  return "Unplugged";
}

export {
  CEILING_KWH,
  FLOOR_KWH,
  PACK_KWH,
  READINESS_MARGIN,
  REQUIRED_KWH,
  ROUND_HOURS,
  ROUND_KWH,
  STEP_HOURS,
  STEPS_PER_DAY,
  clockMatches,
  minuteLabel
} from "./energy.ts";
export type {
  BillSplit,
  CartEnergy,
  ClockSample,
  DemandWindow,
  EnergyPrice,
  MeterTopology,
  PeakTarget,
  PowerSetpoint,
  SiteSample,
  Tariff,
  TeeRound,
  WindowBill
} from "./energy.ts";
