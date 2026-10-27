import { apiClient } from "@/lib/api/client";

export type AssistMessage = {
	role: "user" | "assistant" | "system";
	content: string;
};

export type AssistResponse = {
	reply: string;
	provider: string;
	model: string;
};

export type AiStatus = {
	ok: boolean;
	provider?: string;
};

export const aiService = {
	status: (accessToken: string, tenantId: string) =>
		apiClient.get<AiStatus>(`/tenants/${tenantId}/ai/status`, { accessToken }),
	assist: (
		accessToken: string,
		tenantId: string,
		input: { messages: AssistMessage[]; context?: string },
	): Promise<AssistResponse> =>
		apiClient.post<AssistResponse>(`/tenants/${tenantId}/ai/assist`, input, { accessToken }),
	draftAcademics: (
		accessToken: string,
		tenantId: string,
		input: {
			kind: "homework" | "assessment";
			topic: string;
			subjectName?: string;
			sectionName?: string;
			gradeLevel?: string;
			durationMinutes?: number;
			maxScore?: number;
			assessmentType?: "quiz" | "test" | "exam";
			tone?: "standard" | "challenge" | "support";
		},
	) =>
		apiClient.post<{
			title: string;
			description: string;
			materials: string | null;
			instructions: string | null;
			provider: string;
			model: string;
		}>(`/tenants/${tenantId}/ai/academics/draft`, input, { accessToken }),
};
