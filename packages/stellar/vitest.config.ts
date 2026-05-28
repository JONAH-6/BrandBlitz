import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineProject } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const sharedSetupFile = path.resolve(projectRoot, "../../tests/setup.ts");

export default defineProject({
  test: {
    name: "@brandblitz/stellar",
    root: projectRoot,
    environment: "node",
    setupFiles: [sharedSetupFile],
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      thresholds: {
        branches: 0,
        functions: 0,
        lines: 0,
        statements: 0,
      },
    },
  },
});
