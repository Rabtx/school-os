import { describe, expect, it } from "vitest";
import { navCountLabel, navItemClass, navItemIconClass } from "./nav-item.styles";

describe("nav item", () => {
	it("fills the active row and centres a collapsed one", () => {
		expect(navItemClass(true)).toContain("bg-(--rx-selected)");
		expect(navItemClass(true)).toContain("font-[510]");
		expect(navItemClass(false)).toContain("hover:bg-(--rx-selected)");
		expect(navItemClass(false, true)).toContain("justify-center");
	});

	it("dims inactive icons", () => {
		expect(navItemIconClass(false)).toContain("text-(--rx-text-tertiary)");
		expect(navItemIconClass(true)).toContain("text-(--rx-text)");
	});

	it("hides zero counts and caps large ones", () => {
		expect(navCountLabel(0)).toBeNull();
		expect(navCountLabel(undefined)).toBeNull();
		expect(navCountLabel(14)).toBe("14");
		expect(navCountLabel(1200)).toBe("999+");
	});
});
