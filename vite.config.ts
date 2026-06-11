import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // three.js is ~1MB minified; it lives in the lazily-imported BattleCanvas
    // chunk (see src/App.tsx), so the size warning is expected and harmless.
    chunkSizeWarningLimit: 1100,
  },
  test: {
    environment: "node",
    globals: true,
  },
});
