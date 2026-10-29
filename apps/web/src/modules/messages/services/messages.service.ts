import { apiClient } from "@/lib/api/client";
import type { Recipient, ThreadDetail, ThreadList } from "../types/messages.types";

const base = (tenantId: string) => `/tenants/${tenantId}/messages`;

export const messagesService = {
	threads: (
		accessToken: string,
		tenantId: string,
		params: { filter: "all" | "needs_reply"; search?: string },
	) => {
		const query = new URLSearchParams({ filter: params.filter });
		if (params.search) query.set("search", params.search);
		return apiClient.get<ThreadList>(`${base(tenantId)}/threads?${query}`, { accessToken });
	},
	thread: (accessToken: string, tenantId: string, threadId: string) =>
		apiClient.get<ThreadDetail>(`${base(tenantId)}/threads/${threadId}`, { accessToken }),
	start: (
		accessToken: string,
		tenantId: string,
		body: { studentId: string; guardianId?: string; body: string },
	) => apiClient.post<ThreadDetail>(`${base(tenantId)}/threads`, body, { accessToken }),
	reply: (accessToken: string, tenantId: string, threadId: string, body: string) =>
		apiClient.post<ThreadDetail>(
			`${base(tenantId)}/threads/${threadId}/messages`,
			{ body },
			{ accessToken },
		),
	recipients: (accessToken: string, tenantId: string, search: string) =>
		apiClient.get<{ recipients: Recipient[] }>(
			`${base(tenantId)}/recipients?search=${encodeURIComponent(search)}`,
			{ accessToken },
		),
};
