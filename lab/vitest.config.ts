import { defineConfig } from "vitest/config";
// Tests for the development-only lab (run: npx vitest run --config lab/vitest.config.ts).
export default defineConfig({ test: { include: ["lab/**/*.test.ts"], environment: "node" } });
