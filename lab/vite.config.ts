// Development-only AI feasibility lab. Separate Vite root and server: it is never part of the production build
// (the app's build uses ../vite.config.ts, whose entry is src/). Run with `npm run lab` → http://localhost:5174
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react()],
  worker: { format: "es" },
  server: {
    port: 5174,
    strictPort: true,
    // Cross-origin isolation lets ONNX Runtime use multi-threaded WASM where the browser supports it.
    // "credentialless" keeps CDN/model downloads working; browsers without it fall back to single-threaded WASM.
    headers: { "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "credentialless" },
  },
});
