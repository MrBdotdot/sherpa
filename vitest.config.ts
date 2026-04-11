import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    passWithNoTests: true,
    exclude: ["node_modules", ".next", ".worktrees/**"],
  },
});
