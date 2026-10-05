import { useState } from "react";
import { REQUIRED_KWH } from "shared";
import { DayChart } from "../components/DayChart";
import { useDay } from "../day";
import { sendNext, teeLabel, usd } from "../model";

export function PlanPage() {
  const { day, error, policy, step, setStep, meter, meterBlind, setMeterBlind, linkLoss, setLinkLoss, priorityRule } = useDay();
  const [cartId, setCartId] = useState<string | null>(null);
  if (error) return <p className="lede">{error}</p>;
  if (!day) return <p className="lede">Loading the plan…</p>;
  const now = day.steps[step].plan;
  const next = sendNext(day, policy, step, priorityRule, ["c22"]);
  const cart = day.carts.find((item) => item.id === (cartId ?? (linkLoss ? "c22" : next[0]?.id)));
  const before = day.bills.unmanaged.totalDollars;
  const after = day.bills.plan.totalDollars;

  return (
    <div className="today">
      <header className="today-head">
        <div>
          <h1>Plan</h1>
          <p className="lede">{day.solver}</p>
        </div>
        <div className="choice-row">
          <span className={`meter-toggle locked${meter === "pump" ? " on" : ""}`}>
            Separate pump meter
            <span className="meter-toggle-track" aria-hidden="true">
              <span className="meter-toggle-knob" />
            </span>
          </span>
          <span className="choice locked on">{priorityRule ? "Priority rule" : "Optimizer order"}</span>
          <button type="button" className={`choice${meterBlind ? " on" : ""}`} onClick={() => setMeterBlind(!meterBlind)}>
            Meter feed lost
          </button>
          <button
            type="button"
            className={`choice${linkLoss ? " on" : ""}`}
            onClick={() => {
              setLinkLoss(!linkLoss);
              setCartId("c22");
            }}
          >
            Cart 22 link lost
          </button>
        </div>
      </header>
      <div className="readouts">
        <p>
          <strong>{usd(before)}</strong>
          <span>unmanaged, if this day sets the peaks, plus wear</span>
        </p>
        <p>
          <strong>{usd(after)}</strong>
          <span>plan, including {usd(day.bills.plan.wearDollars)} of wear</span>
        </p>
        <p>
          <strong>{usd(before - after)}</strong>
          <span>kept off the month</span>
        </p>
      </div>
      <p className="intent">
        Next 15 minutes: {now.intent} Binding limit: {now.binding}. Fleet {now.netCartKw > 0 ? `charge ${now.chargeKw}` : now.netCartKw < 0 ? `discharge ${now.dischargeKw}` : "hold"} kW.
      </p>
      <DayChart day={day} policy="plan" step={step} onStep={setStep} compare />
      <p className="meta">Solid line is the selected policy. Dashed line is the other one. The amber line is the anytime target.</p>
      <h2>Send this cart next</h2>
      <ol className="send-list wide">
        {next.map((row) => (
          <li key={row.id} className={`${row.short ? "short" : ""} ${cart?.id === row.id ? "picked" : ""}`}>
            <button type="button" onClick={() => setCartId(row.id)}>
              <strong>{row.label}</strong>
              <span>
                {row.percent}% · {row.tee} · {row.id === "c22" && linkLoss ? "link lost" : row.short ? "short for the round" : row.spare}
              </span>
            </button>
          </li>
        ))}
      </ol>
      {cart ? (
        <>
          <h2>{cart.label} today</h2>
          <p className="meta">
            Next tee {teeLabel(cart.teeMinute)}. Needs {REQUIRED_KWH.toFixed(1)} kWh to leave.
          </p>
          <div className="table-scroll">
            <table className="bill-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Stored</th>
                  <th>Where</th>
                  <th>Command</th>
                </tr>
              </thead>
              <tbody>
                {day.steps.filter((_, index) => index % 4 === 0).map((sample) => {
                  const index = day.steps.indexOf(sample);
                  const trace = cart[policy];
                  const command = trace.onRound[index] ? "Out, no power" : trace.charge[index] > 0.2 ? `Charge ${trace.charge[index]} kW` : trace.discharge[index] > 0.2 ? `Discharge ${trace.discharge[index]} kW` : "Hold";
                  return (
                    <tr key={sample.minute}>
                      <td>{sample.label}</td>
                      <td>{trace.soc[index].toFixed(1)} kWh</td>
                      <td>{trace.onRound[index] ? `Hole ${trace.hole[index]}` : trace.plugged[index] ? "Barn" : "Unplugged"}</td>
                      <td>{command}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
