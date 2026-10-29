"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireToken } from "@/lib/api/require-token";
import { useCreateApproval } from "@/modules/approvals";
import { useAuth } from "@/modules/auth/context/auth-context";
import { noticesQueryKeys } from "../queries/notices-query-keys";
import { noticesService } from "../services/notices.service";
import type { NoticeAudience, NoticeDraft } from "../types/notices.types";

export function useNoticesQuery(tenantId: string | null, tab: "sent" | "drafts", enabled = true) {
	const { token } = useAuth();
	return useQuery({
		queryKey: noticesQueryKeys.list(tenantId ?? "", tab),
		queryFn: () => noticesService.list(requireToken(token), tenantId ?? "", tab),
		enabled: enabled && Boolean(token && tenantId),
	});
}

export function useNoticeQuery(tenantId: string | null, noticeId: string | null) {
	const { token } = useAuth();
	return useQuery({
		queryKey: noticesQueryKeys.detail(tenantId ?? "", noticeId ?? ""),
		queryFn: () => noticesService.get(requireToken(token), tenantId ?? "", noticeId ?? ""),
		enabled: Boolean(token && tenantId && noticeId),
	});
}

export function useAudienceOptionsQuery(tenantId: string | null, enabled: boolean) {
	const { token } = useAuth();
	return useQuery({
		queryKey: noticesQueryKeys.options(tenantId ?? ""),
		queryFn: () => noticesService.audienceOptions(requireToken(token), tenantId ?? ""),
		enabled: enabled && Boolean(token && tenantId),
	});
}

/** Live count for the composer; an empty class list is not asked about. */
export function useAudiencePreviewQuery(
	tenantId: string | null,
	audience: NoticeAudience,
	enabled: boolean,
) {
	const { token } = useAuth();
	const complete = audience.kind !== "sections" || audience.sectionIds.length > 0;
	return useQuery({
		queryKey: noticesQueryKeys.preview(tenantId ?? "", audience),
		queryFn: () => noticesService.preview(requireToken(token), tenantId ?? "", audience),
		enabled: enabled && complete && Boolean(token && tenantId),
	});
}

export function useInboxQuery(tenantId: string | null) {
	const { token } = useAuth();
	return useQuery({
		queryKey: noticesQueryKeys.inbox(tenantId ?? ""),
		queryFn: () => noticesService.inbox(requireToken(token), tenantId ?? ""),
		enabled: Boolean(token && tenantId),
	});
}

function useRefreshNotices(tenantId: string | null) {
	const queryClient = useQueryClient();
	return () =>
		void queryClient.invalidateQueries({ queryKey: [...noticesQueryKeys.root, tenantId] });
}

export function useNoticeMutations(tenantId: string | null) {
	const { token } = useAuth();
	const refresh = useRefreshNotices(tenantId);
	const id = tenantId ?? "";
	const create = useMutation({
		mutationFn: (draft: NoticeDraft) => noticesService.create(requireToken(token), id, draft),
		onSuccess: refresh,
	});
	const update = useMutation({
		mutationFn: ({ noticeId, draft }: { noticeId: string; draft: Partial<NoticeDraft> }) =>
			noticesService.update(requireToken(token), id, noticeId, draft),
		onSuccess: refresh,
	});
	const remove = useMutation({
		mutationFn: (noticeId: string) => noticesService.remove(requireToken(token), id, noticeId),
		onSuccess: refresh,
	});
	const send = useMutation({
		mutationFn: (noticeId: string) => noticesService.send(requireToken(token), id, noticeId),
		onSuccess: refresh,
	});
	// A teacher's notice goes to the approvals queue as a `notice` request.
	const submit = useCreateApproval<{ noticeId: string }>(tenantId, "notice");
	return { create, update, remove, send, submit, refresh };
}

export function useMarkNoticeRead(tenantId: string | null) {
	const { token } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (noticeId: string) =>
			noticesService.read(requireToken(token), tenantId ?? "", noticeId),
		onSuccess: () =>
			void queryClient.invalidateQueries({ queryKey: noticesQueryKeys.inbox(tenantId ?? "") }),
	});
}
