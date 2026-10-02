import type { Cart } from "shared";

export type Filter = "all" | "charging" | "unplugged" | "offline";

export function filterCarts(carts: Cart[], filter: Filter): Cart[] {
  return carts.filter((cart) => {
    if (filter === "charging") return cart.powerConnected;
    if (filter === "unplugged") return !cart.powerConnected && cart.status !== "offline";
    if (filter === "offline") return cart.status === "offline";
    return true;
  });
}
