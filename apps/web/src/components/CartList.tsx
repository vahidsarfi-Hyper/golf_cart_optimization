import type { Cart } from "shared";
import { isLowBattery, powerLabel } from "shared";
import { filterCarts, type Filter } from "../cartView";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "all" },
  { id: "charging", label: "plugged" },
  { id: "unplugged", label: "unplugged" },
  { id: "offline", label: "No signal" }
];

export function CartList({
  carts,
  filter,
  onFilter,
  selectedId,
  onSelect
}: {
  carts: Cart[];
  filter: Filter;
  onFilter: (filter: Filter) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const visible = filterCarts(carts, filter);

  return (
    <div>
      <div className="filters">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tone-${item.id}${filter === item.id ? " active" : ""}`}
            onClick={() => onFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="list">
        {visible.length === 0 && <p className="meta">No carts in this filter.</p>}
        {visible.map((cart) => (
          <article
            key={cart.id}
            className={`row ${selectedId === cart.id ? "selected" : ""} ${isLowBattery(cart) ? "low" : ""}`}
            onClick={() => onSelect(cart.id)}
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
            <div className={`power ${powerTone(cart)}`}>{powerLabel(cart)}</div>
          </article>
        ))}
      </div>
    </div>
  );
}

function powerTone(cart: Cart): "on" | "off" | "offline" {
  if (cart.status === "offline") return "offline";
  if (cart.powerConnected) return "on";
  return "off";
}
