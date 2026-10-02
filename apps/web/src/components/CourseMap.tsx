import type { Cart } from "shared";
import { isLowBattery } from "shared";

export function CourseMap({
  carts,
  selectedId,
  onSelect,
  className
}: {
  carts: Cart[];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}) {
  return (
    <svg className={className ? `map ${className}` : "map"} viewBox="0 0 100 100" role="img" aria-label="Golf course with cart positions">
      <rect width="100" height="100" fill="#c8ddb8" />
      <ellipse cx="50" cy="50" rx="38" ry="42" fill="#6fa35c" />
      <ellipse cx="22" cy="78" rx="16" ry="12" fill="#d9c48a" />
      <rect x="4" y="70" width="28" height="26" rx="3" fill="#3d6b3a" opacity="0.35" />
      <text x="6" y="74" fontSize="3.2" fill="#1c2a1d">
        Chargers
      </text>
      {carts.map((cart) => (
        <g
          key={cart.id}
          className={onSelect ? "cart-dot live" : "cart-dot"}
          onClick={
            onSelect
              ? (event) => {
                  event.stopPropagation();
                  onSelect(cart.id);
                }
              : undefined
          }
        >
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
  );
}
