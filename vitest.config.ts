import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@worker": path.resolve(__dirname, "src/worker"),
      "@client": path.resolve(__dirname, "src/client"),
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
