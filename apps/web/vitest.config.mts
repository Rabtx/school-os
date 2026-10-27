import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary", "lcov"],
			reportsDirectory: "./coverage",
			// Only enforce coverage on modules that currently have unit tests.
			include: ["src/lib/utils.ts", "src/lib/api-client.ts", "src/lib/api/client.ts"],
			thresholds: {
				lines: 60,
				functions: 55,
				branches: 35,
				statements: 55,
			},
		},
	},
});
