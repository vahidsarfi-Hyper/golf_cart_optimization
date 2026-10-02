import { useState } from "react";
import { isLowBattery } from "shared";
import { CartList } from "../components/CartList";
import { CourseMap } from "../components/CourseMap";
import type { Filter } from "../cartView";
import { carts } from "../energy";

export function FleetPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const charging = carts.filter((cart) => cart.powerConnected).length;
  const unplugged = carts.filter((cart) => !cart.powerConnected && cart.status !== "offline").length;
  const low = carts.filter(isLowBattery).length;

  return (
    <div className="fleet-layout">
      <section className="panel map-panel">
        <h1>Fleet</h1>
        <p className="lede">Course map at 10:00 AM. Select a cart on the map or in the list.</p>
        <CourseMap carts={carts} selectedId={selectedId} onSelect={setSelectedId} className="large" />
      </section>
      <section className="panel">
        <div className="fleet-head">
          <h2>Fleet status</h2>
          <span className="status-dot">{carts.length} carts · 10:00 AM</span>
        </div>
        <div className="stats fleet-stats">
          <Stat label="Fleet" value={carts.length} />
          <Stat label="Plugged" value={charging} />
          <Stat label="Unplugged" value={unplugged} />
          <Stat label="Low battery" value={low} />
        </div>
        <CartList carts={carts} filter={filter} onFilter={setFilter} selectedId={selectedId} onSelect={setSelectedId} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
