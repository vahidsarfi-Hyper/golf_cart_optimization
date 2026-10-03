import { clockMatches, type BillSplit, type ClockSample, type EnergyPrice, type PeakTarget, type Tariff, type WindowBill } from "shared";

export type BillPoint = ClockSample & {
  importKw: number;
  exportKw: number;
};

const ALL_DAY = { startMinute: 0, endMinute: 0, months: [] as number[], weekdays: [] as number[] };
const SUMMER = [6, 7, 8, 9];
const WINTER = [1, 2, 3, 4, 5, 10, 11, 12];
const WEEKDAY = [1, 2, 3, 4, 5];
const PEAK_49 = { startMinute: 16 * 60, endMinute: 21 * 60 };

const PGE = "PG&E B-19 secondary, March 1, 2026 tariff book, cited in docs/optimization-strategy.md.";
const SCE = "SCE TOU-GS-3 facilities and summer on-peak demand, cited in docs/optimization-strategy.md.";
const HECO = "HECO Schedule J effective October 2026, cited in docs/optimization-strategy.md.";
const CONED = "Con Edison large-business time-of-day example rates, cited in docs/optimization-strategy.md. The strategy notes SC 9 for a golf course will differ.";
const FPL = "FPL business rates, September 2026, cited in docs/optimization-strategy.md.";

export const TARIFFS: Tariff[] = [
  {
    id: "pge-b19",
    name: "PG&E B-19",
    fixedMonthlyUsd: 0,
    fixedNote: "Customer charge is not in the strategy extract, so it is billed as zero.",
    source: PGE,
    windows: [
      { id: "anytime", name: "Anytime maximum", usdPerKw: 37.37, ...ALL_DAY, intervalMinutes: 15, source: PGE },
      { id: "summer-peak", name: "Summer peak 4–9 PM", usdPerKw: 46.16, months: SUMMER, weekdays: [], ...PEAK_49, intervalMinutes: 15, source: PGE },
      { id: "winter-peak", name: "Winter peak 4–9 PM", usdPerKw: 2.31, months: WINTER, weekdays: [], ...PEAK_49, intervalMinutes: 15, source: PGE }
    ],
    energy: [
      { usdPerKwh: 0.064, months: [3, 4, 5], weekdays: [], startMinute: 9 * 60, endMinute: 14 * 60, source: PGE },
      { usdPerKwh: 0.186, months: SUMMER, weekdays: [], ...PEAK_49, source: PGE },
      { usdPerKwh: 0.162, months: [3, 4, 5], weekdays: [], ...PEAK_49, source: PGE },
      { usdPerKwh: 0.12, months: [], weekdays: [], startMinute: 0, endMinute: 0, source: PGE }
    ]
  },
  {
    id: "sce-gs3",
    name: "SCE TOU-GS-3",
    fixedMonthlyUsd: 0,
    fixedNote: "Customer charge is not in the strategy extract, so it is billed as zero. Energy charges are omitted for the same reason.",
    source: SCE,
    windows: [
      { id: "facilities", name: "Facilities demand", usdPerKw: 22.02, ...ALL_DAY, intervalMinutes: 15, source: SCE },
      { id: "summer-peak", name: "Summer on-peak 4–9 PM weekdays", usdPerKw: 17.79, months: SUMMER, weekdays: WEEKDAY, ...PEAK_49, intervalMinutes: 15, source: SCE }
    ],
    energy: []
  },
  {
    id: "heco-j",
    name: "HECO Schedule J",
    fixedMonthlyUsd: 0,
    fixedNote: "Customer charge is not in the strategy extract, so it is billed as zero. The 11-month ratchet is not applied inside one month.",
    source: HECO,
    windows: [{ id: "anytime", name: "Demand", usdPerKw: 15.72, ...ALL_DAY, intervalMinutes: 15, source: HECO }],
    energy: [{ usdPerKwh: 0.388, ...ALL_DAY, source: HECO }]
  },
  {
    id: "coned-sc9",
    name: "Con Ed time-of-day",
    fixedMonthlyUsd: 0,
    fixedNote: "Customer charge is not in the strategy extract, so it is billed as zero. Demand interval is modeled as 15 minutes until Con Ed's interval is confirmed. Energy charges are omitted because the extract gives demand only.",
    source: CONED,
    windows: [
      { id: "summer-day", name: "Summer weekdays 8 AM–6 PM", usdPerKw: 12.75, months: SUMMER, weekdays: WEEKDAY, startMinute: 8 * 60, endMinute: 18 * 60, intervalMinutes: 15, source: CONED },
      { id: "summer-extended", name: "Summer weekdays 8 AM–10 PM", usdPerKw: 28.64, months: SUMMER, weekdays: WEEKDAY, startMinute: 8 * 60, endMinute: 22 * 60, intervalMinutes: 15, source: CONED },
      { id: "summer-all", name: "Summer all hours", usdPerKw: 27.33, ...ALL_DAY, months: SUMMER, weekdays: [], intervalMinutes: 15, source: CONED },
      { id: "winter-extended", name: "Other months weekdays 8 AM–10 PM", usdPerKw: 18.15, months: WINTER, weekdays: WEEKDAY, startMinute: 8 * 60, endMinute: 22 * 60, intervalMinutes: 15, source: CONED },
      { id: "winter-all", name: "Other months all hours", usdPerKw: 7.04, ...ALL_DAY, months: WINTER, weekdays: [], intervalMinutes: 15, source: CONED }
    ],
    energy: []
  },
  {
    id: "fpl-gsd1",
    name: "FPL GSD-1",
    fixedMonthlyUsd: 0,
    fixedNote: "Fuel and other clauses are not in the base energy figure. Demand interval is modeled as 15 minutes until FPL's interval is confirmed.",
    source: FPL,
    windows: [{ id: "anytime", name: "Maximum demand", usdPerKw: 12.7, ...ALL_DAY, intervalMinutes: 15, source: FPL }],
    energy: [{ usdPerKwh: 0.028, ...ALL_DAY, source: FPL }]
  },
  {
    id: "fpl-gsdt1",
    name: "FPL GSDT-1",
    fixedMonthlyUsd: 0,
    fixedNote: "Fuel and other clauses are not in the energy figures. Demand interval is modeled as 15 minutes until FPL's interval is confirmed.",
    source: FPL,
    windows: [
      { id: "anytime", name: "Maximum demand", usdPerKw: 0.79, ...ALL_DAY, intervalMinutes: 15, source: FPL },
      { id: "summer-peak", name: "Summer weekday on-peak noon–9 PM", usdPerKw: 11.9, months: [4, 5, 6, 7, 8, 9, 10], weekdays: WEEKDAY, startMinute: 12 * 60, endMinute: 21 * 60, intervalMinutes: 15, source: FPL },
      { id: "winter-morning", name: "Winter weekday 6–10 AM", usdPerKw: 11.9, months: [11, 12, 1, 2, 3], weekdays: WEEKDAY, startMinute: 6 * 60, endMinute: 10 * 60, intervalMinutes: 15, source: FPL },
      { id: "winter-evening", name: "Winter weekday 6–10 PM", usdPerKw: 11.9, months: [11, 12, 1, 2, 3], weekdays: WEEKDAY, startMinute: 18 * 60, endMinute: 22 * 60, intervalMinutes: 15, source: FPL }
    ],
    energy: [
      { usdPerKwh: 0.06, months: [4, 5, 6, 7, 8, 9, 10], weekdays: WEEKDAY, startMinute: 12 * 60, endMinute: 21 * 60, source: FPL },
      { usdPerKwh: 0.06, months: [11, 12, 1, 2, 3], weekdays: WEEKDAY, startMinute: 6 * 60, endMinute: 10 * 60, source: FPL },
      { usdPerKwh: 0.06, months: [11, 12, 1, 2, 3], weekdays: WEEKDAY, startMinute: 18 * 60, endMinute: 22 * 60, source: FPL },
      { usdPerKwh: 0.015, ...ALL_DAY, source: FPL }
    ]
  }
];

export function tariffById(id: string): Tariff {
  const found = TARIFFS.find((tariff) => tariff.id === id);
  if (!found) throw new Error(`Unknown tariff ${id}`);
  return found;
}

export function energyRate(tariff: Tariff, sample: ClockSample): number {
  const match = tariff.energy.find((price) => clockMatches(price, sample));
  return match ? match.usdPerKwh : 0;
}

export function priceBand(cents: number): "peak" | "off-peak" {
  return cents >= 16 ? "peak" : "off-peak";
}

function bucketPeak(points: BillPoint[], window: Tariff["windows"][number]): number {
  const inside = points.filter((point) => clockMatches(window, point));
  if (inside.length === 0) return 0;
  if (window.intervalMinutes <= 15) return Math.max(...inside.map((point) => point.importKw));
  const groups = new Map<string, number[]>();
  for (const point of inside) {
    const bucket = Math.floor(point.minute / window.intervalMinutes) * window.intervalMinutes;
    const key = `${point.date}-${bucket}`;
    const list = groups.get(key) ?? [];
    list.push(point.importKw);
    groups.set(key, list);
  }
  let peak = 0;
  for (const values of groups.values()) {
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    peak = Math.max(peak, average);
  }
  return peak;
}

export function billMonth(tariff: Tariff, points: BillPoint[], targets: PeakTarget[]): BillSplit {
  const energyDollars = points.reduce((sum, point) => {
    const net = point.importKw - point.exportKw;
    return sum + net * energyRate(tariff, point) * 0.25;
  }, 0);
  const windows: WindowBill[] = tariff.windows.map((window) => {
    const target = targets.find((item) => item.windowId === window.id);
    const monthToDateKw = target?.monthToDateKw ?? 0;
    const targetKw = target?.targetKw ?? monthToDateKw;
    const peakKw = round1(bucketPeak(points, window));
    const billed = Math.max(peakKw, monthToDateKw);
    const dollarsAboveTarget = round2(window.usdPerKw * Math.max(0, billed - targetKw));
    return { id: window.id, name: window.name, usdPerKw: window.usdPerKw, monthToDateKw, targetKw, peakKw, dollarsAboveTarget };
  });
  const fixedDollars = tariff.fixedMonthlyUsd;
  const totalDollars = round2(energyDollars + fixedDollars + windows.reduce((sum, window) => sum + window.dollarsAboveTarget, 0));
  return { energyDollars: round2(energyDollars), fixedDollars, windows, totalDollars };
}

export function firstMatchPrice(prices: EnergyPrice[], sample: ClockSample): number {
  return prices.find((price) => clockMatches(price, sample))?.usdPerKwh ?? 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
