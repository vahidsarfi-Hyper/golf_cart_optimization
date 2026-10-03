import { copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function spaFallback(): Plugin {
  return {
    name: "spa-fallback",
    apply: "build",
    closeBundle() {
      const dist = fileURLToPath(new URL("./dist", import.meta.url));
      copyFileSync(path.join(dist, "index.html"), path.join(dist, "404.html"));
    }
  };
}

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react(), spaFallback()],
  resolve: {
    alias: {
      shared: fileURLToPath(new URL("../../packages/shared/src/index.ts", import.meta.url))
    }
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001"
    }
  }
});
