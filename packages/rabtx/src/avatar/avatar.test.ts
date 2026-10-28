import { describe, expect, it } from "vitest";
import { avatarClass, initials } from "./avatar.styles";

describe("avatar", () => {
	it("takes up to two initials", () => {
		expect(initials("Ali Hassan")).toBe("AH");
		expect(initials("  maryam   bibi  khan ")).toBe("MB");
		expect(initials("Zara")).toBe("Z");
		expect(initials("")).toBe("?");
	});

	it("sizes and tones from tokens", () => {
		expect(avatarClass()).toContain("size-6");
		expect(avatarClass("accent", "md")).toContain("text-(--rx-accent)");
		expect(avatarClass("neutral", "lg")).toContain("size-14");
	});
});
