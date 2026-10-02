import cors from "cors";
import express from "express";
import type { Cart } from "shared";
import { seedCarts } from "./seed.ts";

const PORT = Number(process.env.PORT) || 3001;
const carts: Cart[] = seedCarts();

function tick(): void {
  const now = new Date().toISOString();
  for (const cart of carts) {
    if (cart.status === "offline") continue;
    if (cart.powerConnected) {
      cart.batteryPercent = Math.min(100, cart.batteryPercent + 2);
      cart.status = "charging";
    } else if (cart.status === "in_use") {
      cart.batteryPercent = Math.max(0, cart.batteryPercent - 1);
    }
    cart.lastUpdated = now;
  }
}

setInterval(tick, 12000);

const app = express();
app.use(cors({ origin: ["http://localhost:5173"] }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "golf-cart-optimization-api" });
});

app.get("/api/carts", (_req, res) => {
  res.json({ carts });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
