import { useEffect, useState, type ReactNode } from "react";

const EVENT = "app-navigate";

export function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function navigate(to: string): void {
  const next = normalizePath(to);
  if (normalizePath(window.location.pathname) === next) return;
  window.history.pushState({}, "", next);
  window.dispatchEvent(new Event(EVENT));
}

export function usePath(): string {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    const sync = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener("popstate", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  return path;
}

type LinkProps = {
  to: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-current"?: "page";
};

export function Link({ to, className, children, ...aria }: LinkProps) {
  return (
    <a
      href={to}
      className={className}
      aria-label={aria["aria-label"]}
      aria-current={aria["aria-current"]}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
