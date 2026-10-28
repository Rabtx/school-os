"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireToken } from "@/lib/api/require-token";
import { useAuth } from "@/modules/auth/context/auth-context";
import { gradebookQueryKeys } from "../queries/gradebook-query-keys";
import { gradebookService } from "../services/gradebook.service";
import type { GradebookEntryInput, GradebookTerm } from "../types/gradebook.types";

export function useGradebookGridQuery(
	tenantId: string | null,
	params: { sectionId: string; term: GradebookTerm; subjectId?: string } | null,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: gradebookQueryKeys.grid(
			tenantId ?? "",
			params?.sectionId ?? "",
			params?.term ?? "term1",
			params?.subjectId,
		),
		queryFn: () => {
			if (!tenantId || !params) throw new Error("Tenant and params required");
			return gradebookService.grid(requireToken(token), tenantId, params);
		},
		enabled: enabled && Boolean(token && tenantId && params?.sectionId && params?.term),
	});
}

export function useMarksheetQuery(
	tenantId: string | null,
	params: { sectionId: string; subjectId: string } | null,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: gradebookQueryKeys.marks(
			tenantId ?? "",
			params?.sectionId ?? "",
			params?.subjectId ?? "",
		),
		queryFn: () => {
			if (!tenantId || !params) throw new Error("Tenant and class subject required");
			return gradebookService.marks(requireToken(token), tenantId, params);
		},
		enabled: enabled && Boolean(token && tenantId && params?.sectionId && params?.subjectId),
	});
}

export function useStudentReportQuery(
	tenantId: string | null,
	studentId: string | null,
	term?: GradebookTerm,
	enabled = true,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: gradebookQueryKeys.studentReport(tenantId ?? "", studentId ?? "", term),
		queryFn: () => {
			if (!tenantId || !studentId) throw new Error("Tenant and student required");
			return gradebookService.studentReport(requireToken(token), tenantId, studentId, term);
		},
		enabled: enabled && Boolean(token && tenantId && studentId),
	});
}

export function useAddGradebookEntryMutation(tenantId: string) {
	const { token } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: GradebookEntryInput) =>
			gradebookService.addEntry(requireToken(token), tenantId, input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: gradebookQueryKeys.all(tenantId) });
		},
	});
}
