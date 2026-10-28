import type { AssessmentListItem } from "../types/assessments.types";

export type ResultTone = "neutral" | "warning" | "good";

/** What the Result column says: not sent, sent, waiting for marks, or the average so far. */
export function resultSummary(
	row: AssessmentListItem,
	todayIso: string,
): { label: string; tone: ResultTone } {
	if (row.status === "draft") return { label: "Not sent", tone: "neutral" };
	const { graded, absent, averagePercentage } = row.results;
	if (graded > 0 && averagePercentage !== null) {
		const marked = graded + absent;
		const left = row.recipientCount - marked;
		return {
			label: `Average ${averagePercentage}%${left > 0 ? ` · ${left} to mark` : ""}`,
			tone: left > 0 ? "warning" : "good",
		};
	}
	if (row.assessedOn > todayIso) {
		return { label: `Sent to ${row.recipientCount} students`, tone: "neutral" };
	}
	return { label: "Waiting for marks", tone: "warning" };
}

/** "Thu 15 Oct" from the assessment date, plus the start time when one is set. */
export function scheduleLabel(row: { assessedOn: string; startsAt: string | null }): string {
	const date = new Date(`${row.assessedOn}T00:00:00`).toLocaleDateString("en-GB", {
		weekday: "short",
		day: "numeric",
		month: "short",
	});
	if (!row.startsAt) return date;
	const time = new Date(row.startsAt).toLocaleTimeString("en-GB", {
		hour: "2-digit",
		minute: "2-digit",
	});
	return `${date}, ${time}`;
}

export function isQuiz(row: { type: AssessmentListItem["type"] }): boolean {
	return row.type === "quiz";
}
