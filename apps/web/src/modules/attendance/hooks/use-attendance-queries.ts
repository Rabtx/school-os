"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireToken } from "@/lib/api/require-token";
import { useAuth } from "@/modules/auth/context/auth-context";
import { attendanceQueryKeys } from "../queries/attendance-query-keys";
import { attendanceService } from "../services/attendance.service";
import type {
	AttendanceSessionView,
	ConfirmAllPresentInput,
	CreateAttendanceSessionInput,
	MarkAttendanceInput,
} from "../types/attendance.types";

export function useAttendanceSessionQuery(
	tenantId: string | null,
	sectionId: string | null,
	sessionDate: string | null,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: attendanceQueryKeys.session(tenantId ?? "", sectionId ?? "", sessionDate ?? ""),
		queryFn: () => {
			if (!tenantId || !sectionId || !sessionDate) {
				throw new Error("Tenant, section, and session date required");
			}
			return attendanceService
				.findSession(requireToken(token), tenantId, { sectionId, sessionDate })
				.then((response) => response);
		},
		enabled: enabled && Boolean(token && tenantId && sectionId && sessionDate),
		retry: false,
	});
}

export function useGetOrCreateSessionMutation(tenantId: string) {
	const { token } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateAttendanceSessionInput) =>
			attendanceService.getOrCreateSession(requireToken(token), tenantId, input),
		onSuccess: async (data, input) => {
			queryClient.setQueryData<AttendanceSessionView>(
				attendanceQueryKeys.session(tenantId, input.sectionId, input.sessionDate),
				data,
			);
		},
	});
}

export function useMarkAttendanceMutation(tenantId: string, sessionId: string) {
	const { token } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: MarkAttendanceInput) =>
			attendanceService.markAttendance(requireToken(token), tenantId, sessionId, input),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["attendance", "session", tenantId] }),
				queryClient.invalidateQueries({ queryKey: ["staff", tenantId, "me", "dashboard"] }),
			]);
		},
	});
}

export function useConfirmAllPresentMutation(tenantId: string) {
	const { token } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ sessionId, ...input }: ConfirmAllPresentInput & { sessionId: string }) =>
			attendanceService.confirmAllPresent(requireToken(token), tenantId, sessionId, input),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["attendance", "session", tenantId] }),
				queryClient.invalidateQueries({ queryKey: ["staff", tenantId, "me", "dashboard"] }),
			]);
		},
	});
}

export function useStudentAttendanceHistoryQuery(
	tenantId: string | null,
	studentId: string | null,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: attendanceQueryKeys.studentHistory(tenantId ?? "", studentId ?? ""),
		queryFn: () => {
			if (!tenantId || !studentId) throw new Error("Tenant and student required");
			return attendanceService
				.getStudentHistory(requireToken(token), tenantId, studentId)
				.then((response) => response.history);
		},
		enabled: enabled && Boolean(token && tenantId && studentId),
	});
}

/** Leadership dashboard data for one day (and the 13 days before it). */
export function useAttendanceOverviewQuery(
	tenantId: string | null,
	sessionDate: string,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: attendanceQueryKeys.overview(tenantId ?? "", sessionDate),
		queryFn: () => {
			if (!tenantId) throw new Error("Tenant required");
			return attendanceService.getOverview(requireToken(token), tenantId, sessionDate);
		},
		enabled: enabled && Boolean(token && tenantId),
	});
}
