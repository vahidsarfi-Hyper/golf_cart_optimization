import { Link } from "../router";

const MARKS = [
  { to: "/", label: "Home", group: "home", name: "Home" },
  { to: "/fleet", label: "Fleet", group: "home", name: "Fleet status" },
  { to: "/solar", label: "Solar", group: "current", name: "Solar production" },
  { to: "/battery", label: "Battery", group: "current", name: "Battery capacity" },
  { to: "/demand", label: "Demand", group: "current", name: "Power demand and electricity price" },
  { to: "/trips", label: "Trips", group: "current", name: "Trip schedules" },
  { to: "/forecast/solar", label: "Solar", group: "forecast", name: "Solar forecast" },
  { to: "/forecast/capacity", label: "Capacity", group: "forecast", name: "Capacity forecast" },
  { to: "/forecast/demand", label: "Demand", group: "forecast", name: "Demand forecast and future price" },
  { to: "/forecast/trips", label: "Trips", group: "forecast", name: "Future trips" }
] as const;

export function NavBar({ path }: { path: string }) {
  return (
    <nav className="nav" aria-label="Pages">
      {MARKS.map((mark) => (
        <span key={mark.to} className="nav-slot">
          {mark.to === "/solar" && <span className="nav-caption">Now</span>}
          {mark.to === "/forecast/solar" && <span className="nav-caption">Forecast</span>}
          <Link
            to={mark.to}
            className={`nav-mark ${mark.group}${path === mark.to ? " active" : ""}`}
            aria-label={mark.name}
            aria-current={path === mark.to ? "page" : undefined}
          >
            {mark.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
