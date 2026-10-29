import type { NoticeAudience } from "../types/notices.types";

export const noticesQueryKeys = {
	root: ["notices"] as const,
	list: (tenantId: string, tab: string) =>
		[...noticesQueryKeys.root, tenantId, "list", tab] as const,
	detail: (tenantId: string, noticeId: string) =>
		[...noticesQueryKeys.root, tenantId, "detail", noticeId] as const,
	options: (tenantId: string) => [...noticesQueryKeys.root, tenantId, "options"] as const,
	preview: (tenantId: string, audience: NoticeAudience) =>
		[...noticesQueryKeys.root, tenantId, "preview", audience] as const,
	inbox: (tenantId: string) => [...noticesQueryKeys.root, tenantId, "inbox"] as const,
};
