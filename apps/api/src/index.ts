import cors from "cors";
import express from "express";
import type { Cart, MeterTopology } from "shared";
import { PACK_KWH, minuteLabel } from "shared";
import { buildDay, sampleYearCsv, valueYear, type DayPayload } from "./engine.ts";
import { TARIFFS } from "./tariffs.ts";

const PORT = Number(process.env.PORT) || 3001;
const dayCache = new Map<string, DayPayload>();
const valueCache = new Map<string, ReturnType<typeof valueYear>>();

function meterOf(value: unknown): MeterTopology {
  return value === "pump" ? "pump" : "one";
}

function powerOf(value: unknown): number {
  const power = Number(value);
  return power === 1.5 || power === 6 ? power : 3;
}

function dayFor(meter: MeterTopology, powerKw: number, linkLoss: string, meterBlind: boolean): DayPayload {
  const key = `${meter}|${powerKw}|${linkLoss}|${meterBlind}`;
  const cached = dayCache.get(key);
  if (cached) return cached;
  const day = buildDay(meter, powerKw, linkLoss, meterBlind);
  dayCache.set(key, day);
  return day;
}

function cartsAtTen(day: DayPayload): Cart[] {
  const step = 40;
  return day.carts.map((cart, index) => {
    const trace = cart.plan;
    const onRound = trace.onRound[step] === 1;
    const plugged = trace.plugged[step] === 1;
    const hole = onRound ? trace.hole[step] : null;
    return {
      id: cart.id,
      label: cart.label,
      batteryPercent: Math.round((trace.soc[step] / PACK_KWH) * 100),
      powerConnected: plugged,
      status: cart.offline ? "offline" : onRound ? "in_use" : plugged ? "charging" : "available",
      hole,
      position: hole ? { x: 18 + (hole % 9) * 8, y: 22 + Math.floor(hole / 9) * 20 } : { x: 6 + (index % 10) * 2.2, y: 74 + Math.floor(index / 10) * 3 },
      lastUpdated: `${day.date}T10:00:00`
    };
  });
}

const app = express();
app.use(cors({ origin: ["http://localhost:5173"] }));
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "golf-cart-optimization-api" });
});

app.get("/api/tariffs", (_req, res) => {
  res.json({
    tariffs: TARIFFS.map((tariff) => ({ id: tariff.id, name: tariff.name, fixedNote: tariff.fixedNote, source: tariff.source }))
  });
});

app.get("/api/day", (req, res) => {
  const meter = meterOf(req.query.meter);
  const powerKw = powerOf(req.query.powerKw);
  const linkLoss = typeof req.query.linkLoss === "string" ? req.query.linkLoss : "";
  const meterBlind = req.query.meterBlind === "1";
  res.json(dayFor(meter, powerKw, linkLoss, meterBlind));
});

app.get("/api/carts", (req, res) => {
  const day = dayFor(meterOf(req.query.meter), powerOf(req.query.powerKw), "", false);
  res.json({ carts: cartsAtTen(day), clock: minuteLabel(10 * 60) });
});

app.get("/api/value", (req, res) => {
  const meter = meterOf(req.query.meter);
  const powerKw = powerOf(req.query.powerKw);
  const tariff = typeof req.query.tariff === "string" ? req.query.tariff : "pge-b19";
  const key = `${tariff}|${meter}|${powerKw}`;
  try {
    const cached = valueCache.get(key);
    const value = cached ?? valueYear(tariff, meter, powerKw);
    valueCache.set(key, value);
    res.json(value);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not price that tariff." });
  }
});

app.get("/api/value/sample.csv", (_req, res) => {
  res.type("text/csv").send(sampleYearCsv());
});

app.post("/api/value", (req, res) => {
  const meter = meterOf(req.query.meter);
  const powerKw = powerOf(req.query.powerKw);
  const tariff = typeof req.query.tariff === "string" ? req.query.tariff : "pge-b19";
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  const uploaded = rows
    .map((row: { date?: string; minute?: number; nonCartKw?: number }) => {
      const date = String(row.date ?? "");
      const [year, month, day] = date.split("-").map(Number);
      if (!year || !month || !day) return null;
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      return { date, minute: Number(row.minute) || 0, month, weekday, nonCartKw: Number(row.nonCartKw) || 0 };
    })
    .filter((row: { date: string } | null): row is { date: string; minute: number; month: number; weekday: number; nonCartKw: number } => row != null);
  if (uploaded.length < 96) {
    res.status(400).json({ error: "Upload at least one day of date, minute, and nonCartKw rows." });
    return;
  }
  try {
    res.json(valueYear(tariff, meter, powerKw, uploaded));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Could not price that file." });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
