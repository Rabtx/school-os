import type {
	MarksheetAssessmentMark,
	MarksheetHomework,
	MarksheetRow,
} from "../types/gradebook.types";

export type MarkTone = "neutral" | "warning" | "danger";

export type HomeworkPill = { id: string; title: string; label: string; tone: MarkTone };

/** Format a score without trailing zeros ("18", "17.5"). */
function formatScore(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

/** The student's most recent homework, newest first, as "18/20", "waiting" or "missing". */
export function latestHomework(
	row: MarksheetRow,
	homework: MarksheetHomework[],
	nowMs: number,
	limit = 2,
): HomeworkPill[] {
	const pills: HomeworkPill[] = [];
	for (const assignment of homework.toReversed()) {
		if (pills.length === limit) break;
		const mark = row.homework[assignment.id];
		if (!mark) continue;
		pills.push({
			id: assignment.id,
			title: assignment.title,
			...homeworkLabel(mark, assignment, nowMs),
		});
	}
	return pills;
}

function homeworkLabel(
	mark: MarksheetRow["homework"][string],
	assignment: MarksheetHomework,
	nowMs: number,
): { label: string; tone: MarkTone } {
	switch (mark.status) {
		case "graded":
			return mark.marksObtained !== null && mark.totalMarks !== null
				? {
						label: `${formatScore(mark.marksObtained)}/${formatScore(mark.totalMarks)}`,
						tone: "neutral",
					}
				: { label: "marked", tone: "neutral" };
		case "submitted":
		case "late":
			return { label: "waiting", tone: "warning" };
		case "excused":
			return { label: "excused", tone: "neutral" };
		default: {
			const overdue = assignment.dueAt !== null && new Date(assignment.dueAt).getTime() < nowMs;
			return overdue ? { label: "missing", tone: "danger" } : { label: "not due", tone: "neutral" };
		}
	}
}

export function assessmentLabel(
	mark: MarksheetAssessmentMark | undefined,
	maxScore: number,
): string {
	if (!mark) return "—";
	if (mark.status === "absent") return "Absent";
	if (mark.status === "graded" && mark.score !== null) {
		return `${formatScore(mark.score)}/${formatScore(maxScore)}`;
	}
	return "—";
}

/** A and A+ read green, D and below orange; the scale matches the API's `gradeFromPercentage`. */
export function gradeTone(grade: string): "good" | "neutral" | "low" {
	if (grade.startsWith("A")) return "good";
	if (grade === "B" || grade === "C") return "neutral";
	return "low";
}

export type MarksSort = "overall" | "name" | "waiting";

function byName(a: MarksheetRow, b: MarksheetRow): number {
	return a.studentName.localeCompare(b.studentName);
}

export function sortMarksRows(rows: MarksheetRow[], sort: MarksSort): MarksheetRow[] {
	if (sort === "name") return rows.toSorted(byName);
	if (sort === "waiting") {
		return rows.toSorted((a, b) => b.waitingCount - a.waitingCount || byName(a, b));
	}
	// Highest overall first; students with nothing marked yet go last.
	return rows.toSorted(
		(a, b) => (b.overall?.percentage ?? -1) - (a.overall?.percentage ?? -1) || byName(a, b),
	);
}
