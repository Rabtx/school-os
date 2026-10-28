import type { SessionRules } from "@/modules/rules/types/rules.types";

export type AttendanceMarkStatus =
	| "present"
	| "absent"
	| "late"
	| "excused"
	| "left_early"
	| "unknown";

export type AttendanceSession = {
	id: string;
	tenantId: string;
	campusId: string;
	sectionId: string | null;
	sessionType: "class" | "gate" | "bus";
	sessionDate: string;
	startsAt: string | null;
	endsAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type AttendanceMark = {
	id: string;
	tenantId: string;
	sessionId: string;
	studentId: string;
	status: AttendanceMarkStatus;
	markedAt: string | null;
	markedByMembershipId: string | null;
	createdAt: string;
	updatedAt: string;
};

export type AttendanceStatusCounts = {
	present: number;
	absent: number;
	late: number;
	excused: number;
	leftEarly: number;
	unknown: number;
	total: number;
};

export type AttendanceStudentContext = {
	studentId: string;
	guardianName: string | null;
	/** Source of the student's latest attendance event in the session: "manual", "gate", "qr"… */
	checkInSource: string | null;
};

export type AttendanceSessionView = {
	session: AttendanceSession;
	marks: AttendanceMark[];
	summary: AttendanceStatusCounts;
	students: AttendanceStudentContext[];
	/** The school's attendance rules for this day and viewer (closing time, late from, edit window). */
	rules: SessionRules;
};

export type CreateAttendanceSessionInput = {
	sectionId: string;
	sessionDate: string;
	sessionType?: "class" | "gate" | "bus";
};

export type MarkAttendanceInput = {
	marks: Array<{ studentId: string; status: AttendanceMarkStatus }>;
};

export type ConfirmAllPresentInput = {
	exceptStudentIds?: string[];
};

export type StudentAttendanceHistoryEntry = {
	mark: AttendanceMark;
	session: AttendanceSession;
};

export type SchoolDayPulse = {
	sessionDate: string;
	sessionsCount: number;
	sectionsWithSessions: number;
	summary: AttendanceStatusCounts;
	attendanceRate: number | null;
};

export type AttendanceOverviewDay = {
	date: string;
	summary: AttendanceStatusCounts;
	attendanceRate: number | null;
};

export type AttendanceCheckIn = {
	markId: string;
	studentId: string;
	studentCode: string;
	fullName: string;
	status: AttendanceMarkStatus;
	markedAt: string | null;
	sectionName: string | null;
	className: string | null;
	guardianName: string | null;
};

/** Leadership overview: 14 days ending on `sessionDate`, check-in sources and latest marks. */
export type AttendanceOverview = {
	sessionDate: string;
	days: AttendanceOverviewDay[];
	today: { summary: AttendanceStatusCounts; attendanceRate: number | null };
	checkInSources: Array<{ source: string; count: number }>;
	checkIns: AttendanceCheckIn[];
};
