import { DayChart } from "../components/DayChart";
import { useDay } from "../day";
import { usd } from "../model";

export function TodayPage() {
  const { day, error, offline, meter, setMeter, policy, setPolicy, step, setStep } = useDay();
  if (error) return <p className="lede">{error}</p>;
  if (!day) return <p className="lede">Loading the day…</p>;
  const now = day.steps[step];
  const side = now[policy];
  const bill = day.bills[policy];
  const flow = side.netCartKw > 1 ? `charging ${side.chargeKw} kW` : side.netCartKw < -1 ? `discharging ${side.dischargeKw} kW` : "holding";

  return (
    <div className="today">
      <header className="today-head">
        <div>
          <h1>Today</h1>
          <p className="lede">
            {day.date} · {day.tariffName}. {day.meter === "one" ? "Pumps share the cart meter." : "Pumps are on their own meter, so they are off this chart and off this bill."}
            {offline ? " This page includes the demo, so it works without the local API." : ""}
          </p>
        </div>
        <div className="choice-row">
          <button
            type="button"
            className={`meter-toggle${meter === "pump" ? " on" : ""}`}
            aria-pressed={meter === "pump"}
            onClick={() => setMeter(meter === "pump" ? "one" : "pump")}
          >
            Separate pump meter
            <span className="meter-toggle-track" aria-hidden="true">
              <span className="meter-toggle-knob" />
            </span>
          </button>
          <button type="button" className={`choice${policy === "unmanaged" ? " on" : ""}`} onClick={() => setPolicy("unmanaged")}>
            Unmanaged
          </button>
          <button type="button" className={`choice${policy === "plan" ? " on" : ""}`} onClick={() => setPolicy("plan")}>
            Plan
          </button>
        </div>
      </header>
      <div className="readouts">
        <p>
          <strong>
            {side.ready} ready
          </strong>
          <span>for the next wave · {side.short} short</span>
        </p>
        <p>
          <strong>{side.spareKwh.toFixed(0)} kWh</strong>
          <span>above what upcoming rounds need</span>
        </p>
        <p>
          <strong>{flow}</strong>
          <span>net cart power right now</span>
        </p>
      </div>
      <p className="intent">{side.intent}</p>
      <DayChart day={day} policy={policy} step={step} onStep={setStep} />
      <div className="legend">
        <i className="swatch irr" /> Irrigation
        <i className="swatch club" /> Clubhouse
        <i className="swatch charge" /> Cart charge
        <i className="swatch solar" /> Solar
        <i className="swatch import" /> Site import
        <i className="swatch wave" /> Golf wave
      </div>
      <div className="price-band" aria-hidden="true">
        {day.steps.filter((_, index) => index % 2 === 0).map((sample) => (
          <span key={sample.minute} className={sample.band} title={`${sample.label} ${sample.priceCents}¢`} />
        ))}
      </div>
      <p className="meta">Price band. Peak is 18.6¢/kWh from 4 PM to 9 PM. The rest of this July day is 12¢.</p>
      <label className="clock">
        Clock {now.label}
        <input type="range" min={0} max={day.steps.length - 1} value={step} onChange={(event) => setStep(Number(event.target.value))} />
      </label>
      <h2>If this day sets the month</h2>
      <table className="bill-table">
        <thead>
          <tr>
            <th>Window</th>
            <th>Month to date</th>
            <th>Target</th>
            <th>This day</th>
            <th>If the target is missed</th>
          </tr>
        </thead>
        <tbody>
          {bill.windows.map((window) => (
            <tr key={window.id}>
              <td>{window.name}</td>
              <td>{window.monthToDateKw} kW</td>
              <td>{window.targetKw} kW</td>
              <td>{window.peakKw} kW</td>
              <td>{usd(window.dollarsAboveTarget)}</td>
            </tr>
          ))}
          <tr>
            <td>Energy</td>
            <td colSpan={3}>{day.fixedNote}</td>
            <td>{usd(bill.energyDollars)}</td>
          </tr>
        </tbody>
      </table>
      <details>
        <summary>Show 15-minute readings</summary>
        <div className="table-scroll">
          <table className="bill-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Irrigation</th>
                <th>Clubhouse</th>
                <th>Solar</th>
                <th>Carts</th>
                <th>Import</th>
              </tr>
            </thead>
            <tbody>
              {day.steps.map((sample, index) => (
                <tr key={sample.minute} className={index === step ? "picked" : ""}>
                  <td>{sample.label}</td>
                  <td>{day.meter === "one" ? sample.irrigationKw : 0}</td>
                  <td>{sample.clubhouseKw}</td>
                  <td>{sample.solarKw}</td>
                  <td>{sample[policy].netCartKw}</td>
                  <td>{sample[policy].importKw}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <details>
        <summary>Working assumptions</summary>
        <ul>
          {day.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
