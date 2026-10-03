import { PACK_KWH, REQUIRED_KWH, type Cart } from "shared";
import { CourseMap } from "../components/CourseMap";
import { CartDetail } from "../components/CartDetail";
import { useDay } from "../day";
import { sendNext, teeLabel, type DayPayload, type Policy } from "../model";
import { useState } from "react";

export function FleetPage() {
  const { day, error, policy, step, priorityRule, setPriorityRule } = useDay();
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  if (error) return <p className="lede">{error}</p>;
  if (!day) return <p className="lede">Loading the fleet…</p>;
  const carts = day.carts.map((cart, index) => toCart(cart, policy, step, index));
  const selected = carts.find((cart) => cart.id === selectedId) ?? null;
  const selectedSource = day.carts.find((cart) => cart.id === selectedId);
  const counts = {
    all: carts.length,
    plugged: carts.filter((cart) => cart.powerConnected).length,
    unplugged: carts.filter((cart) => !cart.powerConnected && cart.status !== "offline" && cart.status !== "in_use").length,
    course: carts.filter((cart) => cart.status === "in_use").length,
    offline: carts.filter((cart) => cart.status === "offline").length,
    short: day.carts.filter((cart) => isShort(cart, policy, step)).length
  };
  const visible = carts.filter((cart) => {
    if (filter === "plugged") return cart.powerConnected;
    if (filter === "unplugged") return !cart.powerConnected && cart.status !== "offline" && cart.status !== "in_use";
    if (filter === "course") return cart.status === "in_use";
    if (filter === "offline") return cart.status === "offline";
    if (filter === "short") return isShort(day.carts.find((item) => item.id === cart.id)!, policy, step);
    return true;
  });
  const next = sendNext(day, policy, step, priorityRule);
  const minute = day.steps[step].minute;

  return (
    <div className="fleet-layout">
      <section className="panel map-panel">
        <h1>Fleet</h1>
        <p className="lede">
          {day.steps[step].label}. Select a cart on the map or in the list. {day.steps[step][policy].onCourse} are on a round.
        </p>
        <CourseMap carts={carts} selectedId={selectedId} onSelect={setSelectedId} className="large" showDetails={Boolean(selectedId)} onShowDetails={() => setOpen(true)} />
      </section>
      <section className="panel">
        <div className="fleet-head">
          <h2>Send this cart next</h2>
          <button type="button" className={`choice${priorityRule ? " on" : ""}`} onClick={() => setPriorityRule(!priorityRule)}>
            {priorityRule ? "Priority rule" : "Optimizer order"}
          </button>
        </div>
        <ol className="send-list">
          {next.map((row) => (
            <li key={row.id} className={row.short ? "short" : ""}>
              <button type="button" onClick={() => setSelectedId(row.id)}>
                <strong>{row.label}</strong>
                <span>
                  {row.percent}% · {row.tee} · {row.short ? "short" : row.spare}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="choice-row">
          {(
            [
              ["all", `Fleet ${counts.all}`],
              ["plugged", `Plugged ${counts.plugged}`],
              ["unplugged", `Unplugged ${counts.unplugged}`],
              ["course", `On course ${counts.course}`],
              ["offline", `No signal ${counts.offline}`],
              ["short", `Short ${counts.short}`]
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" className={`choice${filter === id ? " on" : ""}`} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="list fleet-scroll">
          {visible.map((cart) => (
            <article key={cart.id} className={`row${cart.id === selectedId ? " selected" : ""}`} onClick={() => setSelectedId(cart.id)}>
              <strong>{cart.label}</strong>
              <div>
                {cart.batteryPercent}% · {cart.status === "in_use" ? `hole ${cart.hole}` : cart.powerConnected ? "plugged" : cart.status === "offline" ? "no signal" : "unplugged"}
                <div className="meta">Next tee {teeLabel(day.carts.find((item) => item.id === cart.id)?.teeMinute ?? null)}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel tee-sheet">
        <h2>Tee sheet</h2>
        <table className="bill-table">
          <thead>
            <tr>
              <th>Tee</th>
              <th>Carts</th>
              <th>Ready</th>
              <th>Short</th>
            </tr>
          </thead>
          <tbody>
            {day.rounds.map((round) => {
              const assigned = day.carts.filter((cart) => cart.teeMinute === round.minute);
              const future = round.minute > minute;
              const ready = assigned.filter((cart) => (cart[policy].soc[step] ?? 0) + 0.05 >= REQUIRED_KWH).length;
              const short = future ? assigned.length - ready : 0;
              return (
                <tr key={round.minute}>
                  <td>{round.label}</td>
                  <td>{round.required}</td>
                  <td>{future ? ready : "Out"}</td>
                  <td>{future ? short : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {open && selected && selectedSource ? (
        <CartDetail
          cart={selected}
          extra={{
            nextTee: teeLabel(selectedSource.teeMinute),
            ready: (selectedSource[policy].soc[step] ?? 0) + 0.05 >= REQUIRED_KWH ? "Covers the round" : "Short for the round",
            spare: `${((selectedSource[policy].soc[step] ?? 0) - REQUIRED_KWH).toFixed(1)} kWh versus 4.8 kWh`
          }}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function isShort(cart: DayPayload["carts"][number], policy: Policy, step: number): boolean {
  if (cart.teeMinute == null || cart[policy].onRound[step] === 1 || cart.offline) return false;
  return (cart[policy].soc[step] ?? 0) + 0.05 < REQUIRED_KWH;
}

function toCart(cart: DayPayload["carts"][number], policy: Policy, step: number, index: number): Cart {
  const trace = cart[policy];
  const onRound = trace.onRound[step] === 1;
  const plugged = trace.plugged[step] === 1;
  const hole = onRound ? trace.hole[step] : null;
  return {
    id: cart.id,
    label: cart.label,
    batteryPercent: Math.round(((trace.soc[step] ?? 0) / PACK_KWH) * 100),
    powerConnected: plugged,
    status: cart.offline ? "offline" : onRound ? "in_use" : plugged ? "charging" : "available",
    hole,
    position: hole ? { x: 30 + (hole % 8) * 7, y: 18 + Math.floor((hole - 1) / 8) * 16 } : { x: 5 + (index % 8) * 2.6, y: 76 + Math.floor(index / 8) * 2.4 },
    lastUpdated: ""
  };
}
