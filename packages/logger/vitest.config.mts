import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary", "lcov"],
			reportsDirectory: "./coverage",
			thresholds: {
				lines: 80,
				functions: 65,
				branches: 65,
				statements: 80,
			},
		},
	},
});
