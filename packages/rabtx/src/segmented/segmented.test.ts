import { describe, expect, it } from "vitest";
import { nextSegment, segmentClass } from "./segmented.styles";

const values = ["present", "late", "absent", "excused"] as const;

describe("nextSegment", () => {
	it("moves with the arrow keys and wraps", () => {
		expect(nextSegment(values, "present", "ArrowRight")).toBe("late");
		expect(nextSegment(values, "excused", "ArrowRight")).toBe("present");
		expect(nextSegment(values, "present", "ArrowLeft")).toBe("excused");
		expect(nextSegment(values, "late", "ArrowUp")).toBe("present");
		expect(nextSegment(values, "late", "ArrowDown")).toBe("absent");
	});

	it("starts from the first segment when nothing is chosen", () => {
		expect(nextSegment(values, null, "ArrowRight")).toBe("present");
		expect(nextSegment(values, null, "End")).toBe("excused");
		expect(nextSegment(values, "absent", "Home")).toBe("present");
	});

	it("ignores other keys", () => {
		expect(nextSegment(values, "late", "Enter")).toBeNull();
		expect(nextSegment([], null, "ArrowRight")).toBeNull();
	});
});

describe("segmentClass", () => {
	it("raises the selected segment in its tone", () => {
		expect(segmentClass(true, "danger")).toContain("text-(--rx-danger)");
		expect(segmentClass(true)).toContain("bg-(--rx-pressed)");
		expect(segmentClass(false, "danger")).not.toContain("text-(--rx-danger)");
	});
});
