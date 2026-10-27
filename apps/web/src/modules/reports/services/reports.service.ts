import { apiClient } from "@/lib/api/client";
import type {
	AttendanceReport,
	GradesReport,
	HomeworkReport,
	ReportOverview,
	ReportTerm,
	SchoolAttendanceReport,
	SchoolReportPeriod,
} from "../types/reports.types";

export const reportsService = {
	overview: (accessToken: string, tenantId: string, params?: { sectionId?: string }) => {
		const search = new URLSearchParams();
		if (params?.sectionId) search.set("sectionId", params.sectionId);
		const query = search.toString();
		return apiClient.get<ReportOverview>(
			`/tenants/${tenantId}/reports/overview${query ? `?${query}` : ""}`,
			{ accessToken },
		);
	},
	grades: (
		accessToken: string,
		tenantId: string,
		params: { sectionId: string; term?: ReportTerm },
	) => {
		const search = new URLSearchParams({ sectionId: params.sectionId });
		if (params.term) search.set("term", params.term);
		return apiClient.get<GradesReport>(`/tenants/${tenantId}/reports/grades?${search.toString()}`, {
			accessToken,
		});
	},
	attendance: (
		accessToken: string,
		tenantId: string,
		params: { sectionId: string; from?: string; to?: string },
	) => {
		const search = new URLSearchParams({ sectionId: params.sectionId });
		if (params.from) search.set("from", params.from);
		if (params.to) search.set("to", params.to);
		return apiClient.get<AttendanceReport>(
			`/tenants/${tenantId}/reports/attendance?${search.toString()}`,
			{ accessToken },
		);
	},
	homework: (accessToken: string, tenantId: string, params: { sectionId: string }) => {
		const search = new URLSearchParams({ sectionId: params.sectionId });
		return apiClient.get<HomeworkReport>(
			`/tenants/${tenantId}/reports/homework?${search.toString()}`,
			{ accessToken },
		);
	},
	schoolAttendance: (
		accessToken: string,
		tenantId: string,
		params: { period: SchoolReportPeriod; date: string },
	) => {
		const search = new URLSearchParams(params);
		return apiClient.get<SchoolAttendanceReport>(
			`/tenants/${tenantId}/attendance/report?${search.toString()}`,
			{ accessToken },
		);
	},
};
