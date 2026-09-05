import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: "@design-system",
        replacement: path.resolve(__dirname, "./src/components/DesignSystem"),
      },
    ],
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    // Playwright specs under e2e/ run via `npm run test:e2e`, not vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
    server: {
      deps: {
        inline: ["doom-design-system"],
      },
    },
  },
});
