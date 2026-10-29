export type ApprovalStatus = "pending" | "approved" | "declined" | "expired" | "cancelled";
export type ApprovalRisk = "low" | "medium" | "high";

export type ApprovalFact = { label: string; value: string };

export type ApprovalCard = {
	title: string;
	subtitle: string;
	quote: { label: string; text: string } | null;
	noteLabel?: string;
	facts: ApprovalFact[];
	outcome: string;
	approveLabel: string;
	declineTitle: string;
	declineReasons: string[];
};

export type ApprovalView = {
	id: string;
	type: string;
	label: string;
	status: ApprovalStatus;
	risk: ApprovalRisk;
	approverRole: "leadership" | "owner";
	payload: Record<string, unknown>;
	note: string | null;
	requester: { membershipId: string | null; name: string | null };
	createdAt: string;
	expiresAt: string | null;
	card: ApprovalCard;
	decision: { by: string | null; at: string; reason: string | null } | null;
	effect: { headline: string; facts: ApprovalFact[] } | null;
	undoUntil: string | null;
	expiry: { summary: string; facts: ApprovalFact[] } | null;
	declined: string | null;
};

export type ApprovalQueue = {
	pending: ApprovalView[];
	today: { approved: number; declined: number; expired: number; longestWaitMinutes: number | null };
};

export type AttendanceChangeInput = {
	sessionId: string;
	studentId: string;
	status: "present" | "late" | "absent" | "excused" | "left_early";
};

export type LeaveReason = "sick" | "family" | "travel" | "other";

export type LeaveInput = {
	studentId: string;
	fromDate: string;
	toDate: string;
	reason: LeaveReason;
};

export type MarksChangeInput = {
	assessmentId: string;
	studentId: string;
	status: "pending" | "graded" | "absent";
	score: number | null;
};
