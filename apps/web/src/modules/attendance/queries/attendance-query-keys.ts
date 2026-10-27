export const attendanceQueryKeys = {
	session: (tenantId: string, sectionId: string, sessionDate: string) =>
		["attendance", "session", tenantId, sectionId, sessionDate] as const,
	studentHistory: (tenantId: string, studentId: string) =>
		["attendance", "student-history", tenantId, studentId] as const,
	overview: (tenantId: string, sessionDate: string) =>
		["attendance", "overview", tenantId, sessionDate] as const,
};
