import { apiClient } from "@/lib/api/client";
import type { ApprovalQueue, ApprovalView } from "../types/approvals.types";

const base = (tenantId: string) => `/tenants/${tenantId}/approvals`;

export const approvalsService = {
	queue: (accessToken: string, tenantId: string) =>
		apiClient.get<ApprovalQueue>(base(tenantId), { accessToken }),
	mine: (accessToken: string, tenantId: string) =>
		apiClient.get<ApprovalView[]>(`${base(tenantId)}/mine`, { accessToken }),
	create: (
		accessToken: string,
		tenantId: string,
		body: { type: string; input: object; note?: string },
	) => apiClient.post<ApprovalView>(base(tenantId), body, { accessToken }),
	approve: (accessToken: string, tenantId: string, id: string) =>
		apiClient.post<ApprovalView>(`${base(tenantId)}/${id}/approve`, {}, { accessToken }),
	decline: (accessToken: string, tenantId: string, id: string, reason: string) =>
		apiClient.post<ApprovalView>(`${base(tenantId)}/${id}/decline`, { reason }, { accessToken }),
	undo: (accessToken: string, tenantId: string, id: string) =>
		apiClient.post<ApprovalView>(`${base(tenantId)}/${id}/undo`, {}, { accessToken }),
	cancel: (accessToken: string, tenantId: string, id: string) =>
		apiClient.post<ApprovalView>(`${base(tenantId)}/${id}/cancel`, {}, { accessToken }),
};
