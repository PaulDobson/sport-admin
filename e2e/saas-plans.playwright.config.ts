import { defineConfig, devices } from "@playwright/test";
import base from "../playwright.config";

export default defineConfig({
  ...base,
  testDir: ".",
  testMatch: "saas-plans-experience.spec.ts",
  webServer: undefined,
  fullyParallel: false,
  projects: [{ name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } }],
});
