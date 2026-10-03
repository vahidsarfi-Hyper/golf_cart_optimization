import { useState } from "react";
import { PageFrame } from "../components/PageFrame";
import { SlotChart } from "../components/SlotChart";
import {
  formatSolarKw,
  HISTORY_CAPTION,
  historySamples,
  PANELS_PRODUCING,
  PANELS_TOTAL,
  PLANT_RATING_KW,
  solarHistoryKwh
} from "../energy";

export function SolarPage() {
  const [selected, setSelected] = useState(historySamples.length - 1);
  const point = historySamples[selected];
  const nowKw = historySamples[historySamples.length - 1]?.solarKw ?? 0;

  return (
    <PageFrame
      title="Solar Production"
      headline={`${formatSolarKw(nowKw)} kW`}
      note="Clear-sky output for a 100 kW plant. Energy since 6:00 AM holds each reading, except 10:00 AM, for 10 minutes."
    >
      <p className="meta">{HISTORY_CAPTION}</p>
      <div className="curve-row">
        <div className="curve-pane">
          <Gauge value={nowKw} max={PLANT_RATING_KW} />
          <div className="stats">
            <div className="stat">
              <span>Panels producing</span>
              <strong>
                {PANELS_PRODUCING} / {PANELS_TOTAL}
              </strong>
            </div>
            <div className="stat">
              <span>Output at 10:00 AM</span>
              <strong>{formatSolarKw(nowKw)} kW</strong>
            </div>
            <div className="stat">
              <span>Energy since 6:00 AM</span>
              <strong>{solarHistoryKwh.toFixed(2)} kWh</strong>
            </div>
            <div className="stat">
              <span>Plant rating</span>
              <strong>{PLANT_RATING_KW} kW</strong>
            </div>
          </div>
          <SlotChart
            labels={historySamples.map((sample) => sample.label)}
            series={[{ name: "kW", color: "#1f7a3a", values: historySamples.map((sample) => sample.solarKw) }]}
            selected={selected}
            onSelect={setSelected}
          />
          {point && (
            <p className="readout">
              {point.label} · {formatSolarKw(point.solarKw)} kW
            </p>
          )}
        </div>
        <div className="curve-side">
          <div className="table-scroll">
            <table className="slot-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>kW</th>
                </tr>
              </thead>
              <tbody>
                {historySamples.map((sample, index) => (
                  <tr key={sample.minute} className={index === selected ? "picked" : ""} onMouseEnter={() => setSelected(index)} onClick={() => setSelected(index)}>
                    <td>{sample.label}</td>
                    <td>{formatSolarKw(sample.solarKw)} kW</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function Gauge({ value, max }: { value: number; max: number }) {
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <svg className="gauge" viewBox="0 0 200 118" role="img" aria-label={`${formatSolarKw(value)} kilowatts of ${max}`}>
      <polyline points={semi(1)} fill="none" stroke="#d5e0d2" strokeWidth="14" strokeLinecap="round" />
      <polyline points={semi(pct)} fill="none" stroke="#1f7a3a" strokeWidth="14" strokeLinecap="round" />
      <text x="100" y="96" textAnchor="middle" fontSize="22" fill="#1c2a1d">
        {formatSolarKw(value)} kW
      </text>
      <text x="18" y="112" fontSize="11" fill="#5c6b5e">
        0
      </text>
      <text x="182" y="112" textAnchor="end" fontSize="11" fill="#5c6b5e">
        {max}
      </text>
    </svg>
  );
}

function semi(pct: number): string {
  const cx = 100;
  const cy = 96;
  const radius = 70;
  const steps = 48;
  const count = Math.max(1, Math.round(steps * pct));
  const points: string[] = [];
  for (let i = 0; i <= count; i += 1) {
    const t = pct === 0 ? 0 : (i / count) * pct;
    const angle = Math.PI * (1 - t);
    points.push(`${cx + radius * Math.cos(angle)},${cy - radius * Math.sin(angle)}`);
  }
  return points.join(" ");
}
