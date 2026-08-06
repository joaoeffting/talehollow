import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // tests share one seeded book/chapter, so runs must not race each other
  retries: 0,
  workers: 1,
  reporter: "list",
  globalSetup: "./tests/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    storageState: path.join(__dirname, "tests/.auth/user.json"),
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
