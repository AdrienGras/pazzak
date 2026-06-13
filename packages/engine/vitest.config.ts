import { defineConfig } from "vitest/config";

// Couverture scope engine (seul package à logique réelle ; cf. spec CI §4.2).
export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			reportsDirectory: "./coverage",
			include: ["src/**"],
		},
	},
});
