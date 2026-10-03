export type MeterTopology = "one" | "pump";

export type ClockSample = {
  date: string;
  minute: number;
  month: number;
  weekday: number;
};

export type DemandWindow = {
  id: string;
  name: string;
  usdPerKw: number;
  months: number[];
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  intervalMinutes: number;
  source: string;
};

export type EnergyPrice = {
  usdPerKwh: number;
  months: number[];
  weekdays: number[];
  startMinute: number;
  endMinute: number;
  source: string;
};

export type Tariff = {
  id: string;
  name: string;
  fixedMonthlyUsd: number;
  fixedNote: string;
  windows: DemandWindow[];
  energy: EnergyPrice[];
  source: string;
};

export type PeakTarget = {
  windowId: string;
  monthToDateKw: number;
  targetKw: number;
};

export type SiteSample = ClockSample & {
  label: string;
  irrigationKw: number;
  clubhouseKw: number;
  solarKw: number;
  cartChargeKw: number;
  cartDischargeKw: number;
  pricePerKwh: number;
};

export type TeeRound = {
  id: string;
  teeMinute: number;
  carts: number;
  durationSteps: number;
  kwhPerCart: number;
};

export type CartEnergy = {
  id: string;
  socKwh: number;
  plugged: boolean;
  onRound: boolean;
};

export type PowerSetpoint = {
  cartId: string;
  chargeKw: number;
  dischargeKw: number;
};

export type WindowBill = {
  id: string;
  name: string;
  usdPerKw: number;
  monthToDateKw: number;
  targetKw: number;
  peakKw: number;
  dollarsAboveTarget: number;
};

export type BillSplit = {
  energyDollars: number;
  fixedDollars: number;
  windows: WindowBill[];
  totalDollars: number;
};

export const PACK_KWH = 6;
export const FLOOR_KWH = 1.2;
export const CEILING_KWH = 5.4;
export const ROUND_HOURS = 4;
export const ROUND_KWH = 4;
export const READINESS_MARGIN = 0.2;
export const REQUIRED_KWH = ROUND_KWH * (1 + READINESS_MARGIN);
export const STEP_HOURS = 0.25;
export const STEPS_PER_DAY = 96;

export function minuteLabel(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${suffix}`;
}

export function clockMatches(window: { months: number[]; weekdays: number[]; startMinute: number; endMinute: number }, sample: ClockSample): boolean {
  if (window.months.length > 0 && !window.months.includes(sample.month)) return false;
  if (window.weekdays.length > 0 && !window.weekdays.includes(sample.weekday)) return false;
  const start = window.startMinute;
  const end = window.endMinute;
  if (start === end) return true;
  if (start < end) return sample.minute >= start && sample.minute < end;
  return sample.minute >= start || sample.minute < end;
}
