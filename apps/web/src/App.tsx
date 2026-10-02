import { NavBar } from "./components/NavBar";
import { ForecastPage } from "./pages/ForecastPage";
import { BatteryPage } from "./pages/BatteryPage";
import { DemandPage } from "./pages/DemandPage";
import { FleetPage } from "./pages/FleetPage";
import { LandingPage } from "./pages/LandingPage";
import { SolarPage } from "./pages/SolarPage";
import { TripsPage } from "./pages/TripsPage";
import { Link, usePath } from "./router";
import "./App.css";

export default function App() {
  const path = usePath();

  return (
    <div className="shell">
      {path !== "/" ? <NavBar path={path} /> : null}
      <Routes path={path} />
    </div>
  );
}

function Routes({ path }: { path: string }) {
  switch (path) {
    case "/":
      return <LandingPage />;
    case "/fleet":
      return <FleetPage />;
    case "/solar":
      return <SolarPage />;
    case "/battery":
      return <BatteryPage />;
    case "/demand":
      return <DemandPage />;
    case "/trips":
      return <TripsPage />;
    case "/forecast/solar":
      return <ForecastPage key="solar" kind="solar" />;
    case "/forecast/capacity":
      return <ForecastPage key="capacity" kind="capacity" />;
    case "/forecast/demand":
      return <ForecastPage key="demand" kind="demand" />;
    case "/forecast/trips":
      return <ForecastPage key="trips" kind="trips" />;
    default:
      return (
        <p className="lede">
          That page is not part of this prototype. <Link to="/">Home</Link>
        </p>
      );
  }
}
