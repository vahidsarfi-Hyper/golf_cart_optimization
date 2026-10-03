import { useEffect } from "react";
import { NavBar } from "./components/NavBar";
import { DayProvider } from "./day";
import { FleetPage } from "./pages/FleetPage";
import { PlanPage } from "./pages/PlanPage";
import { TodayPage } from "./pages/TodayPage";
import { ValuePage } from "./pages/ValuePage";
import { navigate, usePath } from "./router";
import "./App.css";

const REDIRECTS: Record<string, string> = {
  "/solar": "/",
  "/forecast/solar": "/",
  "/battery": "/",
  "/forecast/capacity": "/",
  "/demand": "/",
  "/forecast/demand": "/",
  "/trips": "/fleet",
  "/forecast/trips": "/fleet"
};

export default function App() {
  return (
    <DayProvider>
      <Shell />
    </DayProvider>
  );
}

function Shell() {
  const path = usePath();
  const target = REDIRECTS[path];
  useEffect(() => {
    if (target) navigate(target);
  }, [target]);

  return (
    <div className="shell">
      <NavBar path={target ?? path} />
      {target ? null : <Routes path={path} />}
    </div>
  );
}

function Routes({ path }: { path: string }) {
  switch (path) {
    case "/":
      return <TodayPage />;
    case "/fleet":
      return <FleetPage />;
    case "/plan":
      return <PlanPage />;
    case "/value":
      return <ValuePage />;
    default:
      return <TodayPage />;
  }
}
