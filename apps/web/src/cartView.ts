import type { Cart } from "shared";
import { isLowBattery } from "shared";

export type Filter = "all" | "charging" | "unplugged" | "low";

export function filterCarts(carts: Cart[], filter: Filter): Cart[] {
  return carts.filter((cart) => {
    if (filter === "charging") return cart.powerConnected;
    if (filter === "unplugged") return !cart.powerConnected && cart.status !== "offline";
    if (filter === "low") return isLowBattery(cart);
    return true;
  });
}
