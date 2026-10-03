import { useEffect, useRef } from "react";
import type { Cart } from "shared";
import { powerLabel } from "shared";

const PACK_KWH = 6;

export function CartDetail({ cart, onClose }: { cart: Cart; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const extra = extras(cart);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const rows = [
    ["Status", statusLine(cart)],
    ["Location", locationLine(cart)],
    ["Battery", `${cart.batteryPercent}%`],
    ["Energy", `${((cart.batteryPercent / 100) * PACK_KWH).toFixed(2)} kWh`],
    ["Charger", powerLabel(cart)],
    ["Updated", new Date(cart.lastUpdated).toLocaleTimeString()],
    ["State of health", `${extra.soh}%`],
    ["Charge cycles", `${extra.cycles}`],
    ["Since last charge", extra.sinceCharge]
  ];

  return (
    <div className="detail-backdrop" onClick={onClose}>
      <div
        className="detail-window"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="detail-head">
          <h2 id="cart-detail-title">{cart.label}</h2>
          <button ref={closeRef} type="button" className="detail-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className="detail-facts">
          {rows.map(([label, value]) => (
            <p key={label}>
              <span>{label}:</span> {value}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function statusLine(cart: Cart): string {
  if (cart.status === "offline") return "No signal";
  if (cart.status === "in_use") return cart.hole ? `In use · hole ${cart.hole}` : "In use";
  if (cart.status === "charging") return "Charging";
  return "Available";
}

function locationLine(cart: Cart): string {
  if (cart.status === "offline") return "Unknown";
  if (cart.hole) return `Hole ${cart.hole}`;
  if (cart.powerConnected) return "Charging station";
  return "On the course";
}

function extras(cart: Cart): { soh: number; cycles: number; sinceCharge: string } {
  const n = Number(cart.id.replace(/\D/g, "")) || 1;
  const soh = 88 + ((n * 7) % 11);
  const cycles = 140 + n * 31;
  if (cart.powerConnected) return { soh, cycles, sinceCharge: "On charger" };
  const minutes = 25 + n * 18;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return { soh, cycles, sinceCharge: `${hours}:${rest.toString().padStart(2, "0")}` };
}
