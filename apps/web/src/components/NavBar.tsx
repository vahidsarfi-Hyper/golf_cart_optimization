import { Link } from "../router";

const MARKS = [
  { to: "/", label: "Today" },
  { to: "/fleet", label: "Fleet" },
  { to: "/plan", label: "Plan" },
  { to: "/value", label: "Value" }
] as const;

export function NavBar({ path }: { path: string }) {
  return (
    <nav className="nav" aria-label="Pages">
      {MARKS.map((mark) => (
        <Link key={mark.to} to={mark.to} className={`nav-mark${path === mark.to ? " active" : ""}`} aria-current={path === mark.to ? "page" : undefined}>
          {mark.label}
        </Link>
      ))}
    </nav>
  );
}
