import { defineConfig } from "vitest/config";
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
    server: {
      deps: {
        inline: ["doom-design-system"],
      },
    },
  },
});
