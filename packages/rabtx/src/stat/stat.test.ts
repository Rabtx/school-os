import { describe, expect, it } from "vitest";
import { statDeltaClass, statParts } from "./stat.styles";

describe("stat card", () => {
	it("colors the change by meaning, not direction", () => {
		expect(statDeltaClass("good")).toContain("text-(--rx-accent)");
		expect(statDeltaClass("bad")).toContain("text-(--rx-danger)");
		expect(statDeltaClass()).toContain("text-(--rx-text-tertiary)");
	});

	it("keeps numbers aligned", () => {
		expect(statParts.value).toContain("tabular-nums");
	});
});
