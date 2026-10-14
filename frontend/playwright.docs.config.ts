import { defineConfig } from "@playwright/test";

// Erzeugt die Screenshots fuer die Dokumentation (docs/screenshots). Kein Test im eigentlichen
// Sinn, daher eigene Konfiguration; laeuft nur mit "npm run docs:screenshots".
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "docs-screenshots.spec.ts",
  outputDir: "./test-results-docs",
  workers: 1,
  timeout: 300_000,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL, locale: "de-DE", timezoneId: "Europe/Berlin" },
  webServer: { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 60_000 },
});
