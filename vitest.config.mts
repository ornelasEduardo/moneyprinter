import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@design-system": path.resolve(
        __dirname,
        "./src/components/DesignSystem"
      ),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "src/components/DesignSystem/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
        "dist/",
        ".next/",
      ],
    },
  },
});
