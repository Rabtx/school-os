import { describe, expect, it } from "vitest";
import type { ApprovalView } from "../types/approvals.types";
import {
	longestWaitLabel,
	pendingChangesForSession,
	shortAge,
	timeAgo,
	undoSecondsLeft,
} from "./approval-format";

const now = new Date("2026-10-28T12:00:00Z");

const request = (overrides: Partial<ApprovalView>) =>
	({
		id: "a",
		type: "attendance_change",
		status: "pending",
		payload: { sessionId: "s1", studentId: "st1", status: "late" },
		...overrides,
	}) as ApprovalView;

describe("approval format", () => {
	it("says how long ago a request came in", () => {
		expect(timeAgo("2026-10-28T11:59:40Z", now)).toBe("just now");
		expect(timeAgo("2026-10-28T11:48:00Z", now)).toBe("12 min ago");
		expect(timeAgo("2026-10-28T10:00:00Z", now)).toBe("2 hours ago");
		expect(timeAgo("2026-10-27T11:00:00Z", now)).toBe("1 day ago");
		expect(shortAge("2026-10-28T07:00:00Z", now)).toBe("5 h");
		expect(shortAge("2026-10-25T12:00:00Z", now)).toBe("3 days");
	});

	it("counts the undo window down to zero", () => {
		expect(undoSecondsLeft("2026-10-28T12:00:07.200Z", now)).toBe(8);
		expect(undoSecondsLeft("2026-10-28T11:59:59Z", now)).toBe(0);
		expect(undoSecondsLeft(null, now)).toBe(0);
	});

	it("names the longest wait", () => {
		expect(longestWaitLabel(null)).toBeNull();
		expect(longestWaitLabel(0)).toBe("The longest wait was 1 min.");
		expect(longestWaitLabel(300)).toBe("The longest wait was 5 hours.");
	});

	it("finds pending changes on this roll call only", () => {
		const changes = pendingChangesForSession(
			[
				request({}),
				request({ id: "b", status: "declined", payload: { sessionId: "s1", studentId: "st2" } }),
				request({ id: "c", payload: { sessionId: "s2", studentId: "st3", status: "absent" } }),
			],
			"s1",
		);
		expect([...changes]).toEqual([["st1", { id: "a", status: "late" }]]);
	});
});
