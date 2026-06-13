import { defineConfig } from "vitest/config";

// Couverture scope engine (seul package à logique réelle ; cf. spec CI §4.2).
export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			reportsDirectory: "./coverage",
			include: ["src/**"],
			// Garde dure dans le job CI quality (le step test:coverage échoue sous le seuil).
			// Branches volontairement non gardées (gardes défensives ~89% ; cf. décision CI).
			thresholds: {
				lines: 90,
				statements: 90,
				functions: 90,
			},
		},
	},
});
