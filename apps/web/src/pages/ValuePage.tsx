import { useEffect, useState } from "react";
import { valueYear } from "../../../api/src/engine.ts";
import { useDay } from "../day";
import { usd, type Meter } from "../model";

type ValueResult = {
  year: number;
  typical: { name: string; dollars: number };
  high: { name: string; dollars: number };
  months: { name: string; before: number; after: number; difference: number }[];
  duration: number[];
  fleetKw: number;
  coverHours: number;
  usableKwh: number;
};

const TARIFFS = [
  ["pge-b19", "PG&E B-19"],
  ["sce-gs3", "SCE TOU-GS-3"],
  ["heco-j", "HECO Schedule J"],
  ["coned-sc9", "Con Ed time-of-day"],
  ["fpl-gsd1", "FPL GSD-1"],
  ["fpl-gsdt1", "FPL GSDT-1"]
] as const;

const TARIFF_NOTES: Record<(typeof TARIFFS)[number][0], string> = {
  "pge-b19":
    "Utility: Pacific Gas and Electric\nState: California\nB-19 secondary, effective March 1, 2026. It applies at 500–999 kW, and it is voluntary below 499 kW. Smaller sites use B-10.\nDemand, 15 minutes: anytime maximum $37.37/kW; summer peak 4–9 PM every day $46.16/kW; winter peak 4–9 PM $2.31/kW. The summer part-peak price is known, but the hours are not in the extract, so that window is omitted.\nEnergy: 18.6¢/kWh on the summer peak, 16.2¢/kWh on the March–May peak, 6.4¢/kWh from 9 AM to 2 PM in March–May, and 12¢/kWh otherwise.\nThe customer charge is billed as zero because it is not in the extract.",
  "sce-gs3":
    "Utility: Southern California Edison\nState: California\nTOU-GS-3 covers 200–500 kW. TOU-GS-2 is the schedule below that, from 20–200 kW.\nDemand, 15 minutes: facilities-related $22.02/kW in any hour, plus summer on-peak $17.79/kW on weekdays from 4–9 PM.\nEnergy charges are omitted because they are not in the extract. The customer charge is billed as zero for the same reason.",
  "heco-j":
    "Utility: Hawaiian Electric\nState: Hawaii (Oahu)\nSchedule J, effective October 2026, is for accounts above 25 kW or 5,000 kWh. Schedule P is the larger schedule: 300 kW and up on Oahu, 200 kW on Maui and Hawaii Island.\nDemand: $15.72/kW on the highest 15-minute interval. The real schedule also averages that peak over 11 months. This model bills one month, so that ratchet is not applied.\nEnergy: 38.8¢/kWh all hours. The customer charge is billed as zero because it is not in the extract.",
  "coned-sc9":
    "Utility: Consolidated Edison\nState: New York (New York City and Westchester)\nThese are Con Edison's published large-business time-of-day delivery rates. SC 9 applies above 10 kW, and Rate III is the time-of-day rate from 10–1,500 kW. A golf-course SC 9 bill can differ from this example.\nDemand, modeled as 15 minutes until Con Edison's interval is confirmed: summer weekdays 8 AM–6 PM $12.75/kW; summer weekdays 8 AM–10 PM $28.64/kW; summer all hours $27.33/kW; other months weekdays 8 AM–10 PM $18.15/kW; other months all hours $7.04/kW.\nEnergy charges are omitted because the extract gives demand only. The customer charge is billed as zero.",
  "fpl-gsd1":
    "Utility: Florida Power & Light\nState: Florida\nGSD-1, September 2026 rates, is for 25–499 kW. Duke Energy Florida and TECO serve other parts of the state.\nDemand: one maximum of $12.70/kW, any hour. The interval is modeled as 15 minutes until FPL's interval is confirmed.\nEnergy: 2.8¢/kWh base. Fuel and other clauses are not in that figure. The customer charge is billed as zero.",
  "fpl-gsdt1":
    "Utility: Florida Power & Light\nState: Florida\nGSDT-1 is the optional time-of-use version of GSD-1, September 2026 rates, for 25–499 kW.\nDemand: maximum $0.79/kW any hour, plus on-peak $11.90/kW. On-peak is weekdays noon–9 PM in April–October, and weekdays 6–10 AM and 6–10 PM in November–March. Night charging barely touches the demand charge.\nEnergy: 6¢/kWh on-peak and 1.5¢/kWh otherwise, before fuel and other clauses. The interval is modeled as 15 minutes until FPL's interval is confirmed."
};

export function ValuePage() {
  const { meter } = useDay();
  const [tariff, setTariff] = useState("pge-b19");
  const [power, setPower] = useState("3");
  const [result, setResult] = useState<ValueResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    fetch(`/api/value?tariff=${tariff}&powerKw=${power}&meter=${meter}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: ValueResult & { error?: string }) => {
        if (payload.error) throw new Error(payload.error);
        setResult(payload);
        setError(null);
        setBusy(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        try {
          setResult(valueYear(tariff, meter as Meter, Number(power)) as ValueResult);
          setError(null);
        } catch (fallback) {
          setError(fallback instanceof Error ? fallback.message : "The year could not be priced.");
        }
        setBusy(false);
      });
    return () => controller.abort();
  }, [tariff, power, meter]);

  async function onFile(file: File) {
    const text = await file.text();
    const rows = text
      .trim()
      .split(/\r?\n/)
      .slice(1)
      .map((line) => {
        const [date, minute, nonCartKw] = line.split(",");
        return { date, minute: Number(minute), nonCartKw: Number(nonCartKw) };
      })
      .filter((row) => row.date && Number.isFinite(row.nonCartKw));
    setBusy(true);
    try {
      const response = await fetch(`/api/value?tariff=${tariff}&powerKw=${power}&meter=${meter}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rows })
      });
      const payload = (await response.json()) as ValueResult & { error?: string };
      if (!response.ok || payload.error) throw new Error(payload.error ?? "That file could not be priced.");
      setResult(payload);
      setError(null);
    } catch {
      const uploaded = rows
        .map((row) => {
          const [year, month, day] = row.date.split("-").map(Number);
          if (!year || !month || !day) return null;
          return { date: row.date, minute: row.minute, month, weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(), nonCartKw: row.nonCartKw };
        })
        .filter((row): row is { date: string; minute: number; month: number; weekday: number; nonCartKw: number } => row != null);
      setResult(valueYear(tariff, meter as Meter, Number(power), uploaded) as ValueResult);
      setError(null);
    }
    setBusy(false);
  }

  const peak = result ? Math.max(...result.months.map((month) => month.difference), 1) : 1;

  return (
    <div className="today">
      <header className="today-head">
        <div>
          <h1>Value</h1>
          <p className="lede">A year of this fleet on the sample course. The number is the utility bill difference, after wear.</p>
        </div>
        <div className="choice-row">
          <label>
            Tariff
            <select value={tariff} onChange={(event) => setTariff(event.target.value)}>
              {TARIFFS.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Power
            <select value={power} onChange={(event) => setPower(event.target.value)}>
              <option value="1.5">1.5 kW</option>
              <option value="3">3 kW</option>
              <option value="6">6 kW</option>
            </select>
          </label>
        </div>
        <p className="tariff-note">{TARIFF_NOTES[tariff as keyof typeof TARIFF_NOTES]}</p>
      </header>
      {error ? <p className="lede">{error}</p> : null}
      {busy && !result ? <p className="lede">Pricing the year…</p> : null}
      {result ? (
        <>
          <div className="readouts">
            <p>
              <strong>{usd(result.year)}</strong>
              <span>over 2026, plan versus unmanaged</span>
            </p>
            <p>
              <strong>{usd(result.typical.dollars)}</strong>
              <span>a middle month, {result.typical.name}</span>
            </p>
            <p>
              <strong>{usd(result.high.dollars)}</strong>
              <span>the high month, {result.high.name}</span>
            </p>
          </div>
          <h2>Bill difference by month</h2>
          <div className="month-bars">
            {result.months.map((month) => (
              <div key={month.name}>
                <span style={{ height: `${Math.max(4, (month.difference / peak) * 100)}%` }} />
                <em>{month.name}</em>
              </div>
            ))}
          </div>
          <div className="value-split">
            <section>
              <h2>Where the kilowatts are</h2>
              <p className="meta">
                Unmanaged site import, ranked from the highest interval. The fleet can cover about {result.fleetKw} kW for {result.coverHours} hours ({result.usableKwh} kWh usable). The mark is that power. Value sits in the short peaks above it.
              </p>
              <Duration values={result.duration} mark={result.fleetKw} />
            </section>
            <section>
              <h2>Monthly bills</h2>
              <table className="bill-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Before saving</th>
                      <th>After saving</th>
                      <th>Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.months.map((month) => (
                      <tr key={month.name}>
                        <td>{month.name}</td>
                        <td>{usd(month.before)}</td>
                        <td>{usd(month.after)}</td>
                        <td>{usd(month.difference)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </section>
          </div>
        </>
      ) : null}
      <div className="choice-row">
        <a href="/api/value/sample.csv">Download a sample year</a>
        <label className="choice">
          Upload a year
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
        </label>
      </div>
      <p className="meta">CSV columns: date, minute, nonCartKw. nonCartKw is clubhouse plus irrigation minus solar, before the carts.</p>
    </div>
  );
}

function Duration({ values, mark }: { values: number[]; mark: number }) {
  const max = Math.max(...values, mark, 1);
  const width = 640;
  const height = 180;
  const bar = width / values.length;
  return (
    <svg className="day-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ranked site import">
      {values.map((value, index) => (
        <rect key={index} x={index * bar} y={height - 24 - (value / max) * (height - 36)} width={Math.max(1, bar - 1)} height={(value / max) * (height - 36)} fill="#7d9a78" />
      ))}
      <line x1="0" x2={width} y1={height - 24 - (mark / max) * (height - 36)} y2={height - 24 - (mark / max) * (height - 36)} stroke="#b45309" strokeDasharray="4 3" />
      <text x="4" y="14" fontSize="12" fill="#b45309">
        Fleet power {mark} kW
      </text>
      <text x="0" y={height - 6} fontSize="11" fill="#5c6b5e">
        Highest hours
      </text>
    </svg>
  );
}
