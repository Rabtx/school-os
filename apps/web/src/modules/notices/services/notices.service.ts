import { apiClient } from "@/lib/api/client";
import type {
	AudienceOptions,
	AudienceReach,
	InboxNotice,
	NoticeAudience,
	NoticeDetail,
	NoticeDraft,
	NoticeList,
} from "../types/notices.types";

const base = (tenantId: string) => `/tenants/${tenantId}/notices`;

export const noticesService = {
	list: (accessToken: string, tenantId: string, tab: "sent" | "drafts") =>
		apiClient.get<NoticeList>(`${base(tenantId)}?tab=${tab}`, { accessToken }),
	get: (accessToken: string, tenantId: string, noticeId: string) =>
		apiClient.get<NoticeDetail>(`${base(tenantId)}/${noticeId}`, { accessToken }),
	create: (accessToken: string, tenantId: string, draft: NoticeDraft) =>
		apiClient.post<NoticeDetail>(base(tenantId), draft, { accessToken }),
	update: (accessToken: string, tenantId: string, noticeId: string, draft: Partial<NoticeDraft>) =>
		apiClient.patch<NoticeDetail>(`${base(tenantId)}/${noticeId}`, draft, { accessToken }),
	remove: (accessToken: string, tenantId: string, noticeId: string) =>
		apiClient.delete<{ deleted: boolean }>(`${base(tenantId)}/${noticeId}`, { accessToken }),
	send: (accessToken: string, tenantId: string, noticeId: string) =>
		apiClient.post<NoticeDetail>(`${base(tenantId)}/${noticeId}/send`, {}, { accessToken }),
	audienceOptions: (accessToken: string, tenantId: string) =>
		apiClient.get<AudienceOptions>(`${base(tenantId)}/audience-options`, { accessToken }),
	preview: (accessToken: string, tenantId: string, audience: NoticeAudience) =>
		apiClient.post<{ label: string; reach: AudienceReach }>(
			`${base(tenantId)}/audience-preview`,
			{ audience },
			{ accessToken },
		),
	inbox: (accessToken: string, tenantId: string) =>
		apiClient.get<{ notices: InboxNotice[] }>(`${base(tenantId)}/inbox`, { accessToken }),
	read: (accessToken: string, tenantId: string, noticeId: string) =>
		apiClient.post<{ read: boolean }>(`${base(tenantId)}/${noticeId}/read`, {}, { accessToken }),
};
