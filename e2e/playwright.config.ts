import { defineConfig, devices } from "@playwright/test";

// Squelette P1. Les 5 scénarios (ROADMAP P7) tournent contre `docker compose up`,
// pas contre les serveurs de dev. Pas de waitForTimeout : assertions sur l'état only.
export default defineConfig({
	testDir: "./tests",
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: "list",
	use: {
		baseURL: process.env.WEB_BASE_URL ?? "http://localhost:3000",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
