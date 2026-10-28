import { describe, expect, it } from "vitest";
import { emptyStateMarkClass, emptyStateRole } from "./empty-state.styles";

describe("empty state", () => {
	it("announces errors as alerts and the rest as status", () => {
		expect(emptyStateRole("danger")).toBe("alert");
		expect(emptyStateRole()).toBe("status");
	});

	it("colors the mark for errors", () => {
		expect(emptyStateMarkClass("danger")).toContain("text-(--rx-danger)");
		expect(emptyStateMarkClass()).toContain("text-(--rx-text-secondary)");
	});
});
