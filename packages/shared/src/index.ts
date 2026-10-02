export type CartStatus = "available" | "in_use" | "charging" | "offline";

export type Cart = {
  id: string;
  label: string;
  batteryPercent: number;
  powerConnected: boolean;
  status: CartStatus;
  hole: number | null;
  position: { x: number; y: number };
  lastUpdated: string;
};

export const LOW_BATTERY_THRESHOLD = 20;

export function isLowBattery(cart: Cart): boolean {
  return cart.batteryPercent <= LOW_BATTERY_THRESHOLD;
}

export function powerLabel(cart: Cart): string {
  if (cart.status === "offline") return "No signal";
  if (cart.powerConnected) return "Plugged";
  return "Unplugged";
}
