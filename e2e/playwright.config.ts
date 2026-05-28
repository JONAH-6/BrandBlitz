import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  outputDir: "./artifacts/test-results",
  reporter: process.env.CI
    ? [["html", { outputFolder: "./artifacts/html-report", open: "never" }], ["list"]]
    : [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
