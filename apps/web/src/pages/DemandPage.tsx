import { useState } from "react";
import { PageFrame } from "../components/PageFrame";
import { SlotChart } from "../components/SlotChart";
import { chargerCountNow, formatChargerKw, HISTORY_CAPTION, historySamples, priceBand } from "../energy";

export function DemandPage() {
  const [selected, setSelected] = useState(historySamples.length - 1);
  const point = historySamples[selected];
  const now = historySamples[historySamples.length - 1];
  const drawing = chargerCountNow();

  return (
    <PageFrame
      title="Power Demand & Electricity Price"
      headline={now ? `${formatChargerKw(now.demandKw)} kW · ${now.priceCents}¢/kWh` : "—"}
      note={`${drawing} carts are drawing charger power at 10:00 AM. A full pack that is still plugged in draws nothing. Each line is scaled to its own range. Cheap is under 12¢/kWh. Expensive is 22¢/kWh or more.`}
    >
      <p className="meta">{HISTORY_CAPTION}</p>
      <div className="curve-row">
        <div>
          <SlotChart
            labels={historySamples.map((sample) => sample.label)}
            series={[
              { name: "kW", color: "#1a4f8b", values: historySamples.map((sample) => sample.demandKw) },
              { name: "¢/kWh", color: "#b45309", values: historySamples.map((sample) => sample.priceCents) }
            ]}
            selected={selected}
            onSelect={setSelected}
          />
          {point && (
            <p className="readout">
              {point.label} · {formatChargerKw(point.demandKw)} kW · {point.priceCents}¢/kWh · {priceBand(point.priceCents)}
            </p>
          )}
        </div>
        <div className="table-scroll">
        <table className="slot-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>kW</th>
              <th>¢/kWh</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {historySamples.map((sample, index) => (
              <tr
                key={sample.minute}
                className={`${index === selected ? "picked" : ""} ${priceBand(sample.priceCents).toLowerCase()}`}
                onMouseEnter={() => setSelected(index)}
                onClick={() => setSelected(index)}
              >
                <td>{sample.label}</td>
                <td>{formatChargerKw(sample.demandKw)}</td>
                <td>{sample.priceCents}</td>
                <td>{priceBand(sample.priceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </PageFrame>
  );
}
