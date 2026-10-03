import { useState } from "react";
import { PageFrame } from "../components/PageFrame";
import { SlotChart } from "../components/SlotChart";
import {
  DRIVE_KW,
  FLEET_CARTS,
  FORECAST_CAPTION,
  forecastBalance,
  forecastSamples,
  formatChargerKw,
  formatKwh,
  formatSolarKw,
  headlines,
  isUnderLow,
  LOW_CAPACITY_KWH,
  priceBand,
  ROUND_HOURS,
  ROUND_KWH,
  solarForecastKwh,
  type EnergySample
} from "../energy";

type Kind = "solar" | "capacity" | "demand" | "trips";

export function ForecastPage({ kind }: { kind: Kind }) {
  const [selected, setSelected] = useState(0);
  const point = forecastSamples[selected];
  const copy = describe(kind);

  return (
    <PageFrame title={copy.title} headline={headlines[kind]} note={copy.note}>
      <p className="meta">
        {FORECAST_CAPTION} · {forecastSamples.length} readings
      </p>
      <div className="curve-row">
        <div>
          <SlotChart
            labels={forecastSamples.map((sample) => sample.label)}
            series={copy.series}
            selected={selected}
            onSelect={setSelected}
            marks={kind === "capacity" ? forecastSamples.map((sample) => isUnderLow(sample.capacityKwh)) : undefined}
            guide={kind === "capacity" ? { seriesIndex: 0, value: LOW_CAPACITY_KWH, label: `Low ${LOW_CAPACITY_KWH.toFixed(2)} kWh` } : undefined}
          />
          {point && <p className="readout">{copy.readout(point)}</p>}
        </div>
        <div className="table-scroll">
        <table className="slot-table">
          <thead>
            <tr>
              {copy.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {forecastSamples.map((sample, index) => (
              <tr
                key={sample.minute}
                className={rowClass(kind, sample, index === selected)}
                onMouseEnter={() => setSelected(index)}
                onClick={() => setSelected(index)}
              >
                {copy.cells(sample).map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </PageFrame>
  );
}

function rowClass(kind: Kind, sample: EnergySample, picked: boolean): string {
  const classes: string[] = [];
  if (picked) classes.push("picked");
  if (kind === "capacity" && isUnderLow(sample.capacityKwh)) classes.push("under-low");
  if (kind === "demand") classes.push(priceBand(sample.priceCents).toLowerCase());
  return classes.join(" ");
}

function describe(kind: Kind) {
  const lowCount = forecastSamples.filter((sample) => isUnderLow(sample.capacityKwh)).length;
  if (kind === "solar") {
    return {
      title: "Solar Forecast",
      note: `Clear sky, no cloud cover. ${solarForecastKwh.toFixed(2)} kWh from 10:00 AM to 6:00 PM, holding each reading except 6:00 PM for 10 minutes.`,
      columns: ["Time", "kW"],
      series: [{ name: "kW", color: "#0e4d32", values: forecastSamples.map((sample) => sample.solarKw) }],
      readout: (sample: EnergySample) => `${sample.label} · ${formatSolarKw(sample.solarKw)} kW`,
      cells: (sample: EnergySample) => [sample.label, `${formatSolarKw(sample.solarKw)} kW`]
    };
  }
  if (kind === "capacity") {
    const lowNote =
      lowCount === 0
        ? `No reading is on or under the low-battery line (${LOW_CAPACITY_KWH.toFixed(2)} kWh, 20% of ${FLEET_CARTS} packs).`
        : `${lowCount} of ${forecastSamples.length} readings sit on or under the low-battery line (${LOW_CAPACITY_KWH.toFixed(2)} kWh, 20% of ${FLEET_CARTS} packs).`;
    return {
      title: "Capacity Forecast",
      note: `${lowNote} ${forecastBalance}`,
      columns: ["Time", "Available kWh", "Low line"],
      series: [{ name: "kWh", color: "#1a4f8b", values: forecastSamples.map((sample) => sample.capacityKwh) }],
      readout: (sample: EnergySample) =>
        `${sample.label} · ${formatKwh(sample.capacityHundredths)} kWh${isUnderLow(sample.capacityKwh) ? " · under the low-battery line" : ""}`,
      cells: (sample: EnergySample) => [sample.label, formatKwh(sample.capacityHundredths), isUnderLow(sample.capacityKwh) ? "Under line" : "Ok"]
    };
  }
  if (kind === "demand") {
    return {
      title: "Demand Forecast & Future Price",
      note: "Charger power is 1.50 kW for each pack that still has room. Cheap is under 12¢/kWh. This afternoon window is typical, then expensive from noon to 5:00 PM. Each line is scaled to its own range.",
      columns: ["Time", "kW", "¢/kWh", "Price"],
      series: [
        { name: "kW", color: "#1a4f8b", values: forecastSamples.map((sample) => sample.demandKw) },
        { name: "¢/kWh", color: "#b45309", values: forecastSamples.map((sample) => sample.priceCents) }
      ],
      readout: (sample: EnergySample) =>
        `${sample.label} · ${formatChargerKw(sample.demandKw)} kW · ${sample.priceCents}¢/kWh · ${priceBand(sample.priceCents)}`,
      cells: (sample: EnergySample) => [sample.label, formatChargerKw(sample.demandKw), `${sample.priceCents}`, priceBand(sample.priceCents)]
    };
  }
  return {
    title: "Future Trips",
    note: `Rounds that tee off from 10:00 AM onward. Each one is ${ROUND_HOURS} hours at ${DRIVE_KW.toFixed(2)} kW, so ${ROUND_KWH.toFixed(2)} kWh. Rounds already on the course are counted on the trips page, not again here.`,
    columns: ["Time", "Rounds starting", "Carts needed", "kWh"],
    series: [{ name: "kWh", color: "#0e4d32", values: forecastSamples.map((sample) => sample.tripKwh) }],
    readout: (sample: EnergySample) =>
      `${sample.label} · ${sample.tripsStarting} rounds · ${sample.cartsNeeded} carts · ${sample.tripKwh.toFixed(2)} kWh`,
    cells: (sample: EnergySample) => [sample.label, `${sample.tripsStarting}`, `${sample.cartsNeeded}`, sample.tripKwh.toFixed(2)]
  };
}
