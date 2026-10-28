import { describe, expect, it } from "vitest";
import { filterPillParts, filterPillSelectClass } from "./filter-pill.styles";

describe("filter pill", () => {
	it("is a full-width row on phones and fits its content from sm up", () => {
		expect(filterPillParts.root).toContain("w-full");
		expect(filterPillParts.root).toContain("sm:w-auto");
	});

	it("gives the inner control no border of its own", () => {
		expect(filterPillParts.control).toContain("border-0");
		expect(filterPillSelectClass).toContain(filterPillParts.control);
	});
});
