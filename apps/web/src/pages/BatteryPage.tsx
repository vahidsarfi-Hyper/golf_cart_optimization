import { useState } from "react";
import { PageFrame } from "../components/PageFrame";
import { SlotChart } from "../components/SlotChart";
import {
  cartEnergy,
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
  const total = cartEnergy.reduce((sum, cart) => sum + cart.hundredths, 0);

  return (
    <PageFrame
      title="Battery Capacity"
      headline={`${formatKwh(nowSample.capacityHundredths)} kWh available · ${fleetFlowNow}`}
      note={`Combined energy in the cart packs at 10:00 AM. Each pack is ${PACK_KWH.toFixed(2)} kWh. ${cartEnergy.length} cart batteries. ${historyBalance}`}
    >
      <p className="meta">{HISTORY_CAPTION}</p>
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
      <h2 className="section-title">Carts at 10:00 AM</h2>
      <div className="table-scroll">
        <table className="slot-table">
          <thead>
            <tr>
              <th>Cart</th>
              <th>Percent</th>
              <th>kWh</th>
              <th>Charger</th>
            </tr>
          </thead>
          <tbody>
            {cartEnergy.map((cart) => (
              <tr key={cart.id}>
                <td>{cart.label}</td>
                <td>{cart.percent}%</td>
                <td>{cart.kwh}</td>
                <td>{cart.charger}</td>
              </tr>
            ))}
            <tr>
              <td>Fleet</td>
              <td></td>
              <td>{formatKwh(total)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
