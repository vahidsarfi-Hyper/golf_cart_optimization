import { useState } from "react";
import { CartDetail } from "../components/CartDetail";
import { CartList } from "../components/CartList";
import { CourseMap } from "../components/CourseMap";
import type { Filter } from "../cartView";
import { carts } from "../energy";

export function FleetPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tipAt, setTipAt] = useState<"map" | "list" | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const selected = carts.find((cart) => cart.id === selectedId) ?? null;

  function pick(id: string, at: "map" | "list") {
    setSelectedId(id);
    setTipAt(at);
    setDetailsOpen(false);
  }
  const charging = carts.filter((cart) => cart.powerConnected).length;
  const unplugged = carts.filter((cart) => !cart.powerConnected && cart.status !== "offline").length;
  const offline = carts.filter((cart) => cart.status === "offline").length;

  return (
    <div className="fleet-layout">
      <section className="panel map-panel">
        <h1>Fleet</h1>
        <p className="lede">Course map at 10:00 AM. Select a cart on the map or in the list.</p>
        <CourseMap
          carts={carts}
          selectedId={selectedId}
          onSelect={(id) => pick(id, "map")}
          className="large"
          showDetails={tipAt === "map"}
          onShowDetails={() => setDetailsOpen(true)}
        />
      </section>
      <section className="panel">
        <div className="fleet-head">
          <h2>Fleet status</h2>
          <span className="status-dot">{carts.length} carts · 10:00 AM</span>
        </div>
        <div className="stats fleet-stats">
          <Stat label="Fleet" value={carts.length} tone="all" active={filter === "all"} onClick={() => setFilter("all")} />
          <Stat label="Plugged" value={charging} tone="charging" active={filter === "charging"} onClick={() => setFilter("charging")} />
          <Stat label="Unplugged" value={unplugged} tone="unplugged" active={filter === "unplugged"} onClick={() => setFilter("unplugged")} />
          <Stat label="No signal" value={offline} tone="offline" active={filter === "offline"} onClick={() => setFilter("offline")} />
        </div>
        <CartList
          carts={carts}
          filter={filter}
          onFilter={setFilter}
          hideFilters
          selectedId={selectedId}
          onSelect={(id) => pick(id, "list")}
          showDetailsFor={tipAt === "list" ? selectedId : null}
          onShowDetails={() => setDetailsOpen(true)}
        />
      </section>
      {detailsOpen && selected ? <CartDetail cart={selected} onClose={() => setDetailsOpen(false)} /> : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  active,
  onClick
}: {
  label: string;
  value: number;
  tone: Filter;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`stat tone-${tone}${active ? " active" : ""}`} aria-pressed={active} onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}
