import { apiClient } from "@/lib/api/client";
import type {
	AttendanceSessionView,
	ConfirmAllPresentInput,
	CreateAttendanceSessionInput,
	MarkAttendanceInput,
	AttendanceOverview,
	SchoolDayPulse,
	StudentAttendanceHistoryEntry,
} from "../types/attendance.types";

export const attendanceService = {
	getOrCreateSession: (
		accessToken: string,
		tenantId: string,
		input: CreateAttendanceSessionInput,
	) =>
		apiClient.post<AttendanceSessionView>(`/tenants/${tenantId}/attendance/sessions`, input, {
			accessToken,
		}),
	findSession: (
		accessToken: string,
		tenantId: string,
		params: { sectionId: string; sessionDate: string },
	) => {
		const search = new URLSearchParams({
			sectionId: params.sectionId,
			sessionDate: params.sessionDate,
		});
		return apiClient.get<AttendanceSessionView>(
			`/tenants/${tenantId}/attendance/sessions?${search.toString()}`,
			{ accessToken },
		);
	},
	markAttendance: (
		accessToken: string,
		tenantId: string,
		sessionId: string,
		input: MarkAttendanceInput,
	) =>
		apiClient.post<{
			marks: AttendanceSessionView["marks"];
			summary: AttendanceSessionView["summary"];
		}>(`/tenants/${tenantId}/attendance/sessions/${sessionId}/marks`, input, { accessToken }),
	confirmAllPresent: (
		accessToken: string,
		tenantId: string,
		sessionId: string,
		input: ConfirmAllPresentInput = {},
	) =>
		apiClient.post<AttendanceSessionView>(
			`/tenants/${tenantId}/attendance/sessions/${sessionId}/confirm-all-present`,
			input,
			{ accessToken },
		),
	getStudentHistory: (accessToken: string, tenantId: string, studentId: string) =>
		apiClient.get<{ history: StudentAttendanceHistoryEntry[] }>(
			`/tenants/${tenantId}/attendance/students/${studentId}/history`,
			{ accessToken },
		),
	getOverview: (accessToken: string, tenantId: string, sessionDate: string) =>
		apiClient.get<AttendanceOverview>(
			`/tenants/${tenantId}/attendance/overview?sessionDate=${encodeURIComponent(sessionDate)}`,
			{ accessToken },
		),
	getSchoolDayPulse: (accessToken: string, tenantId: string, sessionDate?: string) => {
		const search = sessionDate ? `?sessionDate=${encodeURIComponent(sessionDate)}` : "";
		return apiClient.get<SchoolDayPulse>(`/tenants/${tenantId}/attendance/school-pulse${search}`, {
			accessToken,
		});
	},
};
