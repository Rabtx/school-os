import type { ApprovalView } from "../types/approvals.types";

/** "just now", "12 min ago", "2 hours ago", "3 days ago". */
export function timeAgo(iso: string, now: Date): string {
	const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 60_000));
	if (minutes < 1) return "just now";
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
	const days = Math.floor(hours / 24);
	return days === 1 ? "1 day ago" : `${days} days ago`;
}

/** Short age for "Up next" rows: "5 h", "1 day". */
export function shortAge(iso: string, now: Date): string {
	const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(iso)) / 60_000));
	if (minutes < 60) return `${Math.max(1, minutes)} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours} h`;
	const days = Math.floor(hours / 24);
	return days === 1 ? "1 day" : `${days} days`;
}

/** Whole seconds left to undo, or 0 once the window has closed. */
export function undoSecondsLeft(undoUntil: string | null, now: Date): number {
	if (!undoUntil) return 0;
	return Math.max(0, Math.ceil((Date.parse(undoUntil) - now.getTime()) / 1000));
}

/** "The longest wait was 5 hours." for the all-done card, or null with nothing decided. */
export function longestWaitLabel(minutes: number | null): string | null {
	if (minutes === null) return null;
	if (minutes < 60) return `The longest wait was ${Math.max(1, minutes)} min.`;
	const hours = Math.round(minutes / 60);
	return `The longest wait was ${hours === 1 ? "1 hour" : `${hours} hours`}.`;
}

export const RISK_LABEL: Record<ApprovalView["risk"], string> = {
	low: "Low risk",
	medium: "Check first",
	high: "High risk",
};

/** Pending attendance changes on one roll call, by student, for the roster. */
export function pendingChangesForSession(
	requests: ApprovalView[] | undefined,
	sessionId: string | null,
): Map<string, { id: string; status: string }> {
	const changes = new Map<string, { id: string; status: string }>();
	if (!sessionId) return changes;
	for (const request of requests ?? []) {
		if (request.type !== "attendance_change" || request.status !== "pending") continue;
		if (request.payload.sessionId !== sessionId) continue;
		const studentId = request.payload.studentId;
		const status = request.payload.status;
		if (typeof studentId === "string" && typeof status === "string") {
			changes.set(studentId, { id: request.id, status });
		}
	}
	return changes;
}
