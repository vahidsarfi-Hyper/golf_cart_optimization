import type { Cart } from "shared";
import { isLowBattery, powerLabel } from "shared";
import { filterCarts, type Filter } from "../cartView";

const FILTERS: Filter[] = ["all", "charging", "unplugged", "low"];

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
          <button key={item} type="button" className={filter === item ? "active" : ""} onClick={() => onFilter(item)}>
            {item}
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
            <div className={`power ${cart.powerConnected ? "on" : "off"}`}>{powerLabel(cart)}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
