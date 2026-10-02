import { useEffect, useState } from "react";
import type { Cart } from "shared";

export function useCarts(): { carts: Cart[]; error: string | null; ready: boolean } {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/carts");
        if (!response.ok) throw new Error(`API ${response.status}`);
        const data = (await response.json()) as { carts: Cart[] };
        if (!cancelled) {
          setCarts(data.carts);
          setError(null);
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setError("Cannot reach the local API. Run npm run dev from the project root.");
          setReady(true);
        }
      }
    }

    load();
    const id = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { carts, error, ready };
}
