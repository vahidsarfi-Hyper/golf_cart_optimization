import { useState } from "react";
import { PageFrame } from "../components/PageFrame";
import { SlotChart } from "../components/SlotChart";
import { DRIVE_KW, formatChargerKw, HISTORY_CAPTION, historySamples, morningRounds, ROUND_HOURS, roundsOnCourse } from "../energy";

export function TripsPage() {
  const [selected, setSelected] = useState(historySamples.length - 1);
  const point = historySamples[selected];
  const used = morningRounds.reduce((sum, round) => sum + Math.round(round.kwh * 100), 0);

  return (
    <PageFrame
      title="Trips schedules"
      headline={`${roundsOnCourse.length} rounds on the course`}
      note={`Each round is ${ROUND_HOURS} hours at ${DRIVE_KW.toFixed(2)} kW. From 6:00 AM to 10:00 AM those rounds use ${(used / 100).toFixed(2)} kWh, which is the driving energy in the chart.`}
    >
      <p className="meta">{HISTORY_CAPTION}</p>
      <div className="curve-row">
        <div>
          <SlotChart
            labels={historySamples.map((sample) => sample.label)}
            series={[{ name: "Drive kW", color: "#1a4f8b", values: historySamples.map((sample) => sample.driveKw) }]}
            selected={selected}
            onSelect={setSelected}
          />
          {point && (
            <p className="readout">
              {point.label} · {formatChargerKw(point.driveKw)} kW driving
            </p>
          )}
        </div>
        <div className="table-scroll">
        <table className="slot-table">
          <thead>
            <tr>
              <th>Tee</th>
              <th>Back</th>
              <th>Cart</th>
              <th>Hole</th>
              <th>kWh by 10:00 AM</th>
              <th>Now</th>
            </tr>
          </thead>
          <tbody>
            {morningRounds.map((round) => (
              <tr key={`${round.cartId}-${round.tee}`}>
                <td>{round.tee}</td>
                <td>{round.back}</td>
                <td>{round.cartLabel}</td>
                <td>{round.hole ?? "—"}</td>
                <td>{round.kwh.toFixed(2)}</td>
                <td>{round.onCourse ? "On course" : "Back"}</td>
              </tr>
            ))}
            <tr>
              <td>Total</td>
              <td></td>
              <td></td>
              <td></td>
              <td>{(used / 100).toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </PageFrame>
  );
}
