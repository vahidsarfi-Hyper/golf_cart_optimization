import { useState } from "react";
import { CourseMap } from "../components/CourseMap";
import { CartList } from "../components/CartList";
import { Link } from "../router";
import type { Filter } from "../cartView";
import { carts, fleetFlowNow, formatChargerKw, formatKwh, formatSolarKw, headlines, nowSample, roundsOnCourse } from "../energy";

export function LandingPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="dash">
      <h1 className="sr-only">Golf Cart Optimization</h1>
      <section className="fleet-card">
        <h2>Fleet Status</h2>
        <Link to="/fleet" className="map-link" aria-label="Open the full fleet map">
          <CourseMap carts={carts} selectedId={selectedId} />
        </Link>
        <h3>Carts</h3>
        <CartList carts={carts} filter={filter} onFilter={setFilter} selectedId={selectedId} onSelect={setSelectedId} />
      </section>

      <section className="energy-card">
        <h2>Energy Balance</h2>
        <div className="energy-cols">
          <div className="status-col">
            <h3>Current status (10:00 AM)</h3>
            <EnergyTile to="/solar" name="Solar Production" headline={`${formatSolarKw(nowSample.solarKw)} kW`} />
            <EnergyTile
              to="/battery"
              name="Battery Capacity"
              headline={`${formatKwh(nowSample.capacityHundredths)} kWh available · ${fleetFlowNow}`}
              detail={`${carts.length} cart batteries`}
            />
            <EnergyTile to="/demand" name="Power Demand & Electricity Price" headline={`${formatChargerKw(nowSample.demandKw)} kW · ${nowSample.priceCents}¢/kWh`} />
            <EnergyTile to="/trips" name="Trips schedules" headline={`${roundsOnCourse.length} rounds now`} />
          </div>
          <div className="forecast-col">
            <h3>Forecast (upto 06:00 PM)</h3>
            <EnergyTile to="/forecast/solar" name="Solar Forecast" headline={headlines.solar} />
            <EnergyTile to="/forecast/capacity" name="Capacity Forecast" headline={headlines.capacity} />
            <EnergyTile to="/forecast/demand" name="Demand Forecast & Future Price" headline={headlines.demand} />
            <EnergyTile to="/forecast/trips" name="Future Trips" headline={headlines.trips} />
          </div>
        </div>
        <button type="button" className="opt-oval" title="Coming later">
          Optimization
          <br />
          output
        </button>
      </section>
    </div>
  );
}

function EnergyTile({ to, name, headline, detail }: { to: string; name: string; headline: string; detail?: string }) {
  return (
    <Link to={to} className="energy-tile">
      <span>{name}</span>
      <strong>{headline}</strong>
      {detail ? <em>{detail}</em> : null}
    </Link>
  );
}
