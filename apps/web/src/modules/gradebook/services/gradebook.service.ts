import { apiClient } from "@/lib/api/client";
import type {
	GradebookEntryInput,
	GradebookGrid,
	GradebookTerm,
	Marksheet,
	StudentReport,
} from "../types/gradebook.types";

export const gradebookService = {
	grid: (
		accessToken: string,
		tenantId: string,
		params: { sectionId: string; term: GradebookTerm; subjectId?: string },
	) => {
		const search = new URLSearchParams({
			sectionId: params.sectionId,
			term: params.term,
		});
		if (params.subjectId) search.set("subjectId", params.subjectId);
		return apiClient.get<GradebookGrid>(`/tenants/${tenantId}/gradebook?${search.toString()}`, {
			accessToken,
		});
	},
	marks: (
		accessToken: string,
		tenantId: string,
		params: { sectionId: string; subjectId: string },
	) =>
		apiClient.get<Marksheet>(
			`/tenants/${tenantId}/gradebook/marks?${new URLSearchParams(params).toString()}`,
			{ accessToken },
		),
	addEntry: (accessToken: string, tenantId: string, input: GradebookEntryInput) =>
		apiClient.post<{ entry: unknown }>(`/tenants/${tenantId}/gradebook/entries`, input, {
			accessToken,
		}),
	studentReport: (
		accessToken: string,
		tenantId: string,
		studentId: string,
		term?: GradebookTerm,
	) => {
		const search = new URLSearchParams();
		if (term) search.set("term", term);
		const query = search.toString();
		return apiClient.get<StudentReport>(
			`/tenants/${tenantId}/gradebook/student/${studentId}${query ? `?${query}` : ""}`,
			{ accessToken },
		);
	},
};
