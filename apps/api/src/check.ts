import assert from "node:assert/strict";
import { billMonth, tariffById } from "./tariffs.ts";
import { buildDay, dischargeNext, sendNext } from "./engine.ts";

const july = Array.from({ length: 96 }, (_, step) => ({
  date: "2026-07-15",
  minute: step * 15,
  month: 7,
  weekday: 3,
  importKw: step === 4 ? 100 : 0,
  exportKw: 0
}));

const summer = billMonth(tariffById("pge-b19"), july, [
  { windowId: "anytime", monthToDateKw: 0, targetKw: 0 },
  { windowId: "summer-peak", monthToDateKw: 0, targetKw: 0 },
  { windowId: "winter-peak", monthToDateKw: 0, targetKw: 0 }
]);
assert.equal(summer.energyDollars, 3);
assert.equal(summer.windows.find((window) => window.id === "anytime")?.dollarsAboveTarget, 3737);
assert.equal(summer.windows.find((window) => window.id === "summer-peak")?.peakKw, 0);

const january = july.map((point) => ({ ...point, date: "2026-01-15", month: 1, importKw: point.minute === 17 * 60 ? 100 : 0 }));
const winter = billMonth(tariffById("pge-b19"), january, [
  { windowId: "anytime", monthToDateKw: 0, targetKw: 0 },
  { windowId: "summer-peak", monthToDateKw: 0, targetKw: 0 },
  { windowId: "winter-peak", monthToDateKw: 0, targetKw: 0 }
]);
assert.equal(winter.windows.find((window) => window.id === "winter-peak")?.dollarsAboveTarget, 231);
assert.equal(winter.windows.find((window) => window.id === "summer-peak")?.dollarsAboveTarget, 0);

const day = buildDay("one", 3);
const spike = 4;
assert.ok(day.steps[spike].unmanaged.importKw > day.steps[spike].plan.importKw + 40, "unmanaged charging stacks on the pumps");
assert.ok(day.steps[40].plan.short >= 1, "a cart is short for the next wave at 10:00");
const separate = buildDay("pump", 3);
assert.ok(separate.steps[spike].unmanaged.importKw < day.steps[spike].irrigationKw, "separate meter excludes pumps");
assert.ok(separate.steps[spike].plan.importKw < day.steps[spike].irrigationKw);

const nine = 36;
const playing = day.carts.find((cart) => cart.teeMinute === 8 * 60);
assert.ok(playing, "an 8:00 round exists");
assert.equal(playing.plan.onRound[nine], 1);
assert.equal(playing.plan.charge[nine], 0);
assert.equal(playing.unmanaged.charge[nine], 0);

const next = sendNext(day, "plan", 40, false);
assert.equal(next[0]?.id, "c70", "the short unplugged cart leads the charge list");
const byPercent = sendNext(day, "plan", 40, true);
assert.notEqual(byPercent[0]?.id, "c70");

const discharge = dischargeNext(day, 4);
assert.ok(discharge.length > 0, "someone can discharge at the pump spike");
assert.ok((discharge[0]?.teeMinute ?? 0) >= 12 * 60 || discharge[0]?.teeMinute == null);

console.log("checks ok", {
  unmanagedSpike: day.steps[spike].unmanaged.importKw,
  planSpike: day.steps[spike].plan.importKw,
  separateUnmanaged: separate.steps[spike].unmanaged.importKw,
  readyAtTen: day.steps[40].plan.ready,
  shortAtTen: day.steps[40].plan.short,
  sendFirst: next[0]
});
