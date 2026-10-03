import { useState } from "react";
import { PageFrame } from "../components/PageFrame";
import { SlotChart } from "../components/SlotChart";
import {
  FLEET_CARTS,
  fleetFlowNow,
  formatKwh,
  HISTORY_CAPTION,
  historyBalance,
  historySamples,
  LOW_CAPACITY_KWH,
  nowSample,
  PACK_KWH
} from "../energy";

export function BatteryPage() {
  const [selected, setSelected] = useState(historySamples.length - 1);
  const point = historySamples[selected];

  return (
    <PageFrame
      title="Battery Capacity"
      headline={`${formatKwh(nowSample.capacityHundredths)} kWh available · ${fleetFlowNow}`}
      note={`Combined energy in the cart packs at 10:00 AM. Each pack is ${PACK_KWH.toFixed(2)} kWh. ${FLEET_CARTS} cart batteries. ${historyBalance}`}
    >
      <p className="meta">{HISTORY_CAPTION}</p>
      <div className="curve-row">
        <div>
          <SlotChart
            labels={historySamples.map((sample) => sample.label)}
            series={[{ name: "kWh", color: "#1a4f8b", values: historySamples.map((sample) => sample.capacityKwh) }]}
            selected={selected}
            onSelect={setSelected}
            guide={{ seriesIndex: 0, value: LOW_CAPACITY_KWH, label: `Low ${LOW_CAPACITY_KWH.toFixed(2)} kWh` }}
          />
          {point && (
            <p className="readout">
              {point.label} · {formatKwh(point.capacityHundredths)} kWh
            </p>
          )}
        </div>
        <div className="table-scroll">
          <table className="slot-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Available kWh</th>
              </tr>
            </thead>
            <tbody>
              {historySamples.map((sample, index) => (
                <tr key={sample.minute} className={index === selected ? "picked" : ""} onMouseEnter={() => setSelected(index)} onClick={() => setSelected(index)}>
                  <td>{sample.label}</td>
                  <td>{formatKwh(sample.capacityHundredths)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageFrame>
  );
}
