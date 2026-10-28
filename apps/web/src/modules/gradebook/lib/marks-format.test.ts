import { describe, expect, it } from "vitest";
import type { MarksheetHomework, MarksheetRow } from "../types/gradebook.types";
import { assessmentLabel, latestHomework, sortMarksRows } from "./marks-format";

const homework: MarksheetHomework[] = [
	{ id: "h1", title: "Set A", dueAt: "2026-10-01T12:00:00Z", status: "published" },
	{ id: "h2", title: "Set B", dueAt: "2026-10-08T12:00:00Z", status: "published" },
	{ id: "h3", title: "Set C", dueAt: "2026-10-30T12:00:00Z", status: "published" },
];

function row(overrides: Partial<MarksheetRow>): MarksheetRow {
	return {
		studentId: "s",
		studentName: "Ali Hassan",
		studentCode: "S1",
		assessments: {},
		homework: {},
		homeworkAverage: null,
		trend: [],
		overall: null,
		waitingCount: 0,
		...overrides,
	};
}

const now = new Date("2026-10-20T00:00:00Z").getTime();

describe("latestHomework", () => {
	it("shows the newest homework first with marks, waiting, missing and not due", () => {
		const pills = latestHomework(
			row({
				homework: {
					h1: { status: "graded", marksObtained: 18, totalMarks: 20, percentage: 90 },
					h2: { status: "pending", marksObtained: null, totalMarks: null, percentage: null },
					h3: { status: "pending", marksObtained: null, totalMarks: null, percentage: null },
				},
			}),
			homework,
			now,
			3,
		);
		expect(pills.map((pill) => `${pill.title} · ${pill.label}`)).toEqual([
			"Set C · not due",
			"Set B · missing",
			"Set A · 18/20",
		]);
		expect(pills[1]?.tone).toBe("danger");
	});

	it("skips homework the student was not set", () => {
		const pills = latestHomework(
			row({
				homework: {
					h1: { status: "submitted", marksObtained: null, totalMarks: null, percentage: null },
				},
			}),
			homework,
			now,
		);
		expect(pills).toEqual([{ id: "h1", title: "Set A", label: "waiting", tone: "warning" }]);
	});
});

describe("assessmentLabel", () => {
	it("reads marks, absent and not marked", () => {
		expect(assessmentLabel({ status: "graded", score: 47.5, percentage: 95 }, 50)).toBe("47.5/50");
		expect(assessmentLabel({ status: "absent", score: null, percentage: null }, 50)).toBe("Absent");
		expect(assessmentLabel({ status: "pending", score: null, percentage: null }, 50)).toBe("—");
		expect(assessmentLabel(undefined, 50)).toBe("—");
	});
});

describe("sortMarksRows", () => {
	it("puts the highest overall first and unmarked students last", () => {
		const rows = [
			row({ studentName: "Zara", overall: null }),
			row({ studentName: "Bilal", overall: { percentage: 70, grade: "B" } }),
			row({ studentName: "Amna", overall: { percentage: 91, grade: "A+" } }),
		];
		expect(sortMarksRows(rows, "overall").map((r) => r.studentName)).toEqual([
			"Amna",
			"Bilal",
			"Zara",
		]);
		expect(sortMarksRows(rows, "name").map((r) => r.studentName)).toEqual([
			"Amna",
			"Bilal",
			"Zara",
		]);
	});
});
