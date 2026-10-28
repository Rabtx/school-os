import { describe, expect, it } from "vitest";
import { tabClass, tabsClass } from "./tabs.styles";

describe("tabs", () => {
	it("marks the active tab with the accent underline", () => {
		expect(tabClass(true)).toContain("border-(--rx-accent)");
		expect(tabClass(true)).toContain("text-(--rx-accent)");
		expect(tabClass(false)).toContain("border-transparent");
		expect(tabClass(false)).not.toContain("text-(--rx-accent)");
	});

	it("scrolls sideways instead of wrapping", () => {
		expect(tabsClass).toContain("overflow-x-auto");
	});
});
