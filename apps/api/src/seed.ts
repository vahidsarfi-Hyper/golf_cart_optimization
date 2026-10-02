import type { Cart } from "shared";

export function seedCarts(): Cart[] {
  const now = new Date().toISOString();
  return [
    { id: "c1", label: "Cart 1", batteryPercent: 94, powerConnected: true, status: "charging", hole: null, position: { x: 12, y: 78 }, lastUpdated: now },
    { id: "c2", label: "Cart 2", batteryPercent: 67, powerConnected: false, status: "in_use", hole: 4, position: { x: 38, y: 42 }, lastUpdated: now },
    { id: "c3", label: "Cart 3", batteryPercent: 18, powerConnected: false, status: "in_use", hole: 11, position: { x: 62, y: 28 }, lastUpdated: now },
    { id: "c4", label: "Cart 4", batteryPercent: 100, powerConnected: true, status: "charging", hole: null, position: { x: 16, y: 84 }, lastUpdated: now },
    { id: "c5", label: "Cart 5", batteryPercent: 81, powerConnected: false, status: "available", hole: null, position: { x: 22, y: 72 }, lastUpdated: now },
    { id: "c6", label: "Cart 6", batteryPercent: 44, powerConnected: false, status: "in_use", hole: 7, position: { x: 48, y: 55 }, lastUpdated: now },
    { id: "c7", label: "Cart 7", batteryPercent: 9, powerConnected: true, status: "charging", hole: null, position: { x: 8, y: 88 }, lastUpdated: now },
    { id: "c8", label: "Cart 8", batteryPercent: 55, powerConnected: false, status: "in_use", hole: 16, position: { x: 78, y: 36 }, lastUpdated: now },
    { id: "c9", label: "Cart 9", batteryPercent: 72, powerConnected: false, status: "available", hole: null, position: { x: 28, y: 80 }, lastUpdated: now },
    { id: "c10", label: "Cart 10", batteryPercent: 0, powerConnected: false, status: "offline", hole: null, position: { x: 88, y: 18 }, lastUpdated: now },
    { id: "c11", label: "Cart 11", batteryPercent: 31, powerConnected: false, status: "in_use", hole: 2, position: { x: 34, y: 22 }, lastUpdated: now },
    { id: "c12", label: "Cart 12", batteryPercent: 88, powerConnected: true, status: "charging", hole: null, position: { x: 14, y: 91 }, lastUpdated: now }
  ];
}
