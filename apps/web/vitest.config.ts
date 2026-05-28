import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineProject } from "vitest/config";
import react from '@vitejs/plugin-react';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineProject({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "./src"),
    },
  },
  test: {
    name: "@brandblitz/web",
    root: projectRoot,
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: [
        "src/components/brand/brand-kit-form.tsx",
        "src/components/game/countdown-timer.tsx",
      ],
      reporter: ["text", "lcov", "json", "html"],
      reportsDirectory: "./coverage",
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
