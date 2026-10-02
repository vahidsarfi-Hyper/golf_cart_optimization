import { useEffect, useMemo, useState } from "react";
import type { Cart } from "shared";
import { isLowBattery, powerLabel } from "shared";
import "./App.css";

type Filter = "all" | "charging" | "unplugged" | "low";

export default function App() {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/carts");
        if (!response.ok) throw new Error(`API ${response.status}`);
        const data = (await response.json()) as { carts: Cart[] };
        if (!cancelled) {
          setCarts(data.carts);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Cannot reach the local API. Run npm run dev from the project root.");
      }
    }

    load();
    const id = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const visible = useMemo(() => {
    return carts.filter((cart) => {
      if (filter === "charging") return cart.powerConnected;
      if (filter === "unplugged") return !cart.powerConnected && cart.status !== "offline";
      if (filter === "low") return isLowBattery(cart);
      return true;
    });
  }, [carts, filter]);

  const charging = carts.filter((c) => c.powerConnected).length;
  const unplugged = carts.filter((c) => !c.powerConnected && c.status !== "offline").length;
  const low = carts.filter(isLowBattery).length;

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>Golf Cart Optimization</h1>
          <p className="lede">Prototype course · live battery and charger status</p>
        </div>
        <div className="status-dot">{error ? "API offline" : `${carts.length} carts`}</div>
      </header>

      {error && <p className="error">{error}</p>}

      <section className="stats">
        <div className="stat">
          <span>Fleet</span>
          <strong>{carts.length}</strong>
        </div>
        <div className="stat">
          <span>On charger</span>
          <strong>{charging}</strong>
        </div>
        <div className="stat">
          <span>Unplugged</span>
          <strong>{unplugged}</strong>
        </div>
        <div className="stat">
          <span>Low battery</span>
          <strong>{low}</strong>
        </div>
      </section>

      <div className="layout">
        <section className="panel">
          <h2>Course map</h2>
          <svg className="map" viewBox="0 0 100 100" role="img" aria-label="Golf course with cart positions">
            <rect width="100" height="100" fill="#c8ddb8" />
            <ellipse cx="50" cy="50" rx="38" ry="42" fill="#6fa35c" />
            <ellipse cx="22" cy="78" rx="16" ry="12" fill="#d9c48a" />
            <rect x="4" y="70" width="28" height="26" rx="3" fill="#3d6b3a" opacity="0.35" />
            <text x="6" y="74" fontSize="3.2" fill="#1c2a1d">
              Chargers
            </text>
            {carts.map((cart) => (
              <g key={cart.id} className="cart-dot" onClick={() => setSelectedId(cart.id)}>
                <circle
                  cx={cart.position.x}
                  cy={cart.position.y}
                  r={selectedId === cart.id ? 3.2 : 2.4}
                  fill={cart.powerConnected ? "#1f7a3a" : isLowBattery(cart) ? "#b42318" : "#1c2a1d"}
                  stroke="white"
                  strokeWidth="0.6"
                />
                <text x={cart.position.x + 3} y={cart.position.y + 1.2} fontSize="3" fill="#1c2a1d">
                  {cart.label.replace("Cart ", "")}
                </text>
              </g>
            ))}
          </svg>
        </section>

        <section className="panel">
          <h2>Carts</h2>
          <div className="filters">
            {(["all", "charging", "unplugged", "low"] as Filter[]).map((item) => (
              <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="list">
            {visible.map((cart) => (
              <article
                key={cart.id}
                className={`row ${selectedId === cart.id ? "selected" : ""} ${isLowBattery(cart) ? "low" : ""}`}
                onClick={() => setSelectedId(cart.id)}
              >
                <strong>{cart.label}</strong>
                <div>
                  <div>
                    {cart.batteryPercent}% · {cart.status.replace("_", " ")}
                    {cart.hole ? ` · hole ${cart.hole}` : ""}
                  </div>
                  <div className={`bar ${isLowBattery(cart) ? "low" : ""}`}>
                    <i style={{ width: `${cart.batteryPercent}%` }} />
                  </div>
                  <div className="meta">Updated {new Date(cart.lastUpdated).toLocaleTimeString()}</div>
                </div>
                <div className={`power ${cart.powerConnected ? "on" : "off"}`}>{powerLabel(cart)}</div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
