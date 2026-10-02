import type { Cart } from "shared";

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
    <svg
      className={className ? `map ${className}` : "map"}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Golf course with a charging station, a sand bunker, and cart positions"
    >
      <rect width="100" height="100" fill="#c8ddb8" />
      <ellipse cx="50" cy="48" rx="38" ry="42" fill="#6fa35c" />
      <ellipse cx="74" cy="70" rx="11" ry="7" fill="#d9c48a" stroke="#c4ad78" strokeWidth="0.4">
        <title>Sand bunker</title>
      </ellipse>
      <g>
        <title>Charging station</title>
        <rect x="3" y="69" width="27" height="28" rx="2" fill="#d6d4cf" stroke="#9a9892" strokeWidth="0.5" />
        <rect x="3" y="69" width="27" height="8" rx="1.5" fill="#3d4a3c" />
        <text x="5.2" y="75" fontSize="3.1" fill="#f4f4f0">
          Chargers
        </text>
        <line x1="10" y1="78.5" x2="10" y2="96" stroke="#9a9892" strokeWidth="0.4" />
        <line x1="17" y1="78.5" x2="17" y2="96" stroke="#9a9892" strokeWidth="0.4" />
        <line x1="24" y1="78.5" x2="24" y2="96" stroke="#9a9892" strokeWidth="0.4" />
      </g>
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
            fill={dotFill(cart)}
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

function dotFill(cart: Cart): string {
  if (cart.status === "offline") return "#1c2a1d";
  if (cart.powerConnected) return "#1f7a3a";
  return "#b42318";
}
