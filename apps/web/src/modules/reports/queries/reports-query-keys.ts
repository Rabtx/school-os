import type { ReportTerm, SchoolReportPeriod } from "../types/reports.types";

export const reportsQueryKeys = {
	all: (tenantId: string) => ["reports", tenantId] as const,
	overview: (tenantId: string, sectionId?: string) =>
		["reports", tenantId, "overview", sectionId ?? "all"] as const,
	grades: (tenantId: string, sectionId: string, term?: ReportTerm) =>
		["reports", tenantId, "grades", sectionId, term ?? "all"] as const,
	attendance: (tenantId: string, sectionId: string, from?: string, to?: string) =>
		["reports", tenantId, "attendance", sectionId, from ?? "all", to ?? "all"] as const,
	homework: (tenantId: string, sectionId: string) =>
		["reports", tenantId, "homework", sectionId] as const,
	schoolAttendance: (tenantId: string, period: SchoolReportPeriod, date: string) =>
		["reports", tenantId, "school-attendance", period, date] as const,
};
