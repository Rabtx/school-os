import { describe, expect, it } from "vitest";
import type { AssessmentListItem } from "../types/assessments.types";
import { resultSummary, scheduleLabel } from "./assessment-format";

function row(overrides: Partial<AssessmentListItem>): AssessmentListItem {
	return {
		id: "a",
		sectionSubjectId: "ss",
		sectionId: "s",
		sectionName: "Grade 7-B",
		subjectId: "sub",
		subjectCode: "MATH",
		subjectName: "Maths",
		type: "test",
		title: "Maths Test 3",
		assessedOn: "2026-10-15",
		maxScore: 50,
		status: "published",
		assignMode: "whole_class",
		startsAt: null,
		durationMinutes: 45,
		room: null,
		instructions: null,
		recipientCount: 30,
		createdByMembershipId: "m",
		createdAt: "2026-10-01T00:00:00Z",
		updatedAt: "2026-10-01T00:00:00Z",
		results: { graded: 0, absent: 0, averagePercentage: null },
		...overrides,
	};
}

describe("resultSummary", () => {
	it("reads drafts, upcoming, waiting and averaged tests", () => {
		expect(resultSummary(row({ status: "draft" }), "2026-10-20").label).toBe("Not sent");
		expect(resultSummary(row({ assessedOn: "2026-10-25" }), "2026-10-20").label).toBe(
			"Sent to 30 students",
		);
		expect(resultSummary(row({}), "2026-10-20")).toEqual({
			label: "Waiting for marks",
			tone: "warning",
		});
		expect(
			resultSummary(
				row({ results: { graded: 26, absent: 2, averagePercentage: 78.4 } }),
				"2026-10-20",
			),
		).toEqual({ label: "Average 78.4% · 2 to mark", tone: "warning" });
		expect(
			resultSummary(
				row({ results: { graded: 29, absent: 1, averagePercentage: 81 } }),
				"2026-10-20",
			),
		).toEqual({ label: "Average 81%", tone: "good" });
	});
});

describe("scheduleLabel", () => {
	it("shows the day and adds the start time when set", () => {
		expect(scheduleLabel({ assessedOn: "2026-10-15", startsAt: null })).toBe("Thu 15 Oct");
		expect(scheduleLabel({ assessedOn: "2026-10-15", startsAt: "2026-10-15T10:00:00" })).toMatch(
			/^Thu 15 Oct, 10:00$/,
		);
	});
});
