/** Mirrors `attendancePolicySchema` in the API (`modules/rules/attendance-policy.ts`). */
export type AttendancePolicy = {
	rollCallClosesAt: string;
	lateAfter: string;
	graceMinutes: number;
	autoMarkAbsent: { enabled: boolean; at: string };
	excuseFromGuardianMessage: boolean;
	gate: { scanMarksPresent: boolean; scanAfterBellIsLate: boolean };
	teacherEditWindowHours: 2 | 24 | 48 | 168 | null;
	absenceAlert: { enabled: boolean; delayMinutes: number };
};

export type AttendancePolicyView = {
	policy: AttendancePolicy;
	/** 0 until the school saves its own rules. */
	version: number;
	updatedAt: string | null;
	lateFrom: string;
	timeZone: string;
	quietHours: { start: string; end: string };
	editWindowOptions: number[];
};

/** The rules as they apply to one roll call day, on every attendance session response. */
export type SessionRules = {
	rollCallClosesAt: string;
	lateAfter: string;
	graceMinutes: number;
	lateFrom: string;
	editableUntil: string | null;
	canEdit: boolean;
};
