import { apiClient } from "@/lib/api/client";
import type {
	Assessment,
	AssessmentDetail,
	AssessmentListItem,
	CreateAssessmentInput,
	UpdateAssessmentInput,
	UpsertAssessmentResultsInput,
} from "../types/assessments.types";

export const assessmentsService = {
	list: (
		accessToken: string,
		tenantId: string,
		params?: { sectionSubjectId?: string; status?: string },
	) => {
		const search = new URLSearchParams();
		if (params?.sectionSubjectId) search.set("sectionSubjectId", params.sectionSubjectId);
		if (params?.status) search.set("status", params.status);
		const query = search.toString();
		return apiClient.get<{ assessments: AssessmentListItem[] }>(
			`/tenants/${tenantId}/assessments${query ? `?${query}` : ""}`,
			{ accessToken },
		);
	},
	planner: (
		accessToken: string,
		tenantId: string,
		params: { from: string; to: string; sectionSubjectId?: string },
	) => {
		const search = new URLSearchParams({ from: params.from, to: params.to });
		if (params.sectionSubjectId) search.set("sectionSubjectId", params.sectionSubjectId);
		return apiClient.get<{ assessments: Assessment[] }>(
			`/tenants/${tenantId}/assessments/planner?${search.toString()}`,
			{ accessToken },
		);
	},
	getById: (accessToken: string, tenantId: string, assessmentId: string) =>
		apiClient.get<{ assessment: AssessmentDetail }>(
			`/tenants/${tenantId}/assessments/${assessmentId}`,
			{ accessToken },
		),
	create: (accessToken: string, tenantId: string, input: CreateAssessmentInput) =>
		apiClient.post<{ assessment: AssessmentDetail }>(`/tenants/${tenantId}/assessments`, input, {
			accessToken,
		}),
	update: (
		accessToken: string,
		tenantId: string,
		assessmentId: string,
		input: UpdateAssessmentInput,
	) =>
		apiClient.patch<{ assessment: AssessmentDetail }>(
			`/tenants/${tenantId}/assessments/${assessmentId}`,
			input,
			{ accessToken },
		),
	upsertResults: (
		accessToken: string,
		tenantId: string,
		assessmentId: string,
		input: UpsertAssessmentResultsInput,
	) =>
		apiClient.put<{ assessment: AssessmentDetail }>(
			`/tenants/${tenantId}/assessments/${assessmentId}/results`,
			input,
			{ accessToken },
		),
};
