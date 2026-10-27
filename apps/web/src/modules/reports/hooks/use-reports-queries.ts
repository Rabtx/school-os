"use client";

import { useQuery } from "@tanstack/react-query";
import { requireToken } from "@/lib/api/require-token";
import { useAuth } from "@/modules/auth/context/auth-context";
import { reportsQueryKeys } from "../queries/reports-query-keys";
import { reportsService } from "../services/reports.service";
import type { ReportTerm, SchoolReportPeriod } from "../types/reports.types";

export function useReportOverviewQuery(
	tenantId: string | null,
	params?: { sectionId?: string },
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: reportsQueryKeys.overview(tenantId ?? "", params?.sectionId),
		queryFn: () => {
			if (!tenantId) throw new Error("Tenant required");
			return reportsService.overview(requireToken(token), tenantId, params);
		},
		enabled: enabled && Boolean(token && tenantId),
	});
}

export function useGradesReportQuery(
	tenantId: string | null,
	params: { sectionId: string; term?: ReportTerm } | null,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: reportsQueryKeys.grades(tenantId ?? "", params?.sectionId ?? "", params?.term),
		queryFn: () => {
			if (!tenantId || !params) throw new Error("Tenant and params required");
			return reportsService.grades(requireToken(token), tenantId, params);
		},
		enabled: enabled && Boolean(token && tenantId && params?.sectionId),
	});
}

export function useAttendanceReportQuery(
	tenantId: string | null,
	params: { sectionId: string; from?: string; to?: string } | null,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: reportsQueryKeys.attendance(
			tenantId ?? "",
			params?.sectionId ?? "",
			params?.from,
			params?.to,
		),
		queryFn: () => {
			if (!tenantId || !params) throw new Error("Tenant and params required");
			return reportsService.attendance(requireToken(token), tenantId, params);
		},
		enabled: enabled && Boolean(token && tenantId && params?.sectionId),
	});
}

export function useHomeworkReportQuery(
	tenantId: string | null,
	params: { sectionId: string } | null,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: reportsQueryKeys.homework(tenantId ?? "", params?.sectionId ?? ""),
		queryFn: () => {
			if (!tenantId || !params) throw new Error("Tenant and params required");
			return reportsService.homework(requireToken(token), tenantId, params);
		},
		enabled: enabled && Boolean(token && tenantId && params?.sectionId),
	});
}

export function useSchoolAttendanceReportQuery(
	tenantId: string | null,
	period: SchoolReportPeriod,
	date: string,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: reportsQueryKeys.schoolAttendance(tenantId ?? "", period, date),
		queryFn: () => {
			if (!tenantId) throw new Error("Tenant required");
			return reportsService.schoolAttendance(requireToken(token), tenantId, { period, date });
		},
		enabled: enabled && Boolean(token && tenantId),
	});
}
