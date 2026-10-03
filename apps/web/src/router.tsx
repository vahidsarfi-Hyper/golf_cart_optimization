import { useEffect, useState, type ReactNode } from "react";

const EVENT = "app-navigate";

function sitePrefix(): string {
  const base = import.meta.env.BASE_URL;
  if (base === "/") return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function toHref(to: string): string {
  const prefix = sitePrefix();
  if (!prefix) return to;
  if (to === "/") return `${prefix}/`;
  return `${prefix}${to}`;
}

export function fromLocation(pathname: string): string {
  const prefix = sitePrefix();
  let path = pathname;
  if (prefix && (path === prefix || path.startsWith(`${prefix}/`))) {
    path = path.slice(prefix.length) || "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;
  return normalizePath(path);
}

export function navigate(to: string): void {
  const next = toHref(to);
  if (normalizePath(window.location.pathname) === normalizePath(next)) return;
  window.history.pushState({}, "", next);
  window.dispatchEvent(new Event(EVENT));
}

export function usePath(): string {
  const [path, setPath] = useState(() => fromLocation(window.location.pathname));

  useEffect(() => {
    const sync = () => setPath(fromLocation(window.location.pathname));
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
      href={toHref(to)}
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
