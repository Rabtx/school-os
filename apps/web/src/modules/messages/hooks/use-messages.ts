"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireToken } from "@/lib/api/require-token";
import { useAuth } from "@/modules/auth/context/auth-context";
import { navigationQueryKeys } from "@/modules/navigation/queries/navigation-query-keys";
import { messagesQueryKeys } from "../queries/messages-query-keys";
import { messagesService } from "../services/messages.service";
import type { ThreadDetail } from "../types/messages.types";

/** New messages arrive without a push channel yet, so open screens check every 15 seconds. */
const POLL_MS = 15_000;

export function useThreadsQuery(
	tenantId: string | null,
	filter: "all" | "needs_reply",
	search: string,
) {
	const { token } = useAuth();
	return useQuery({
		queryKey: messagesQueryKeys.threads(tenantId ?? "", filter, search),
		queryFn: () => messagesService.threads(requireToken(token), tenantId ?? "", { filter, search }),
		enabled: Boolean(token && tenantId),
		refetchInterval: POLL_MS,
	});
}

export function useThreadQuery(tenantId: string | null, threadId: string | null) {
	const { token } = useAuth();
	const queryClient = useQueryClient();
	return useQuery({
		queryKey: messagesQueryKeys.thread(tenantId ?? "", threadId ?? ""),
		queryFn: async () => {
			const detail = await messagesService.thread(
				requireToken(token),
				tenantId ?? "",
				threadId ?? "",
			);
			// Opening a thread reads it: refresh the list's unread dots and the sidebar count.
			void queryClient.invalidateQueries({
				queryKey: [...messagesQueryKeys.root, tenantId, "threads"],
			});
			void queryClient.invalidateQueries({ queryKey: navigationQueryKeys.root });
			return detail;
		},
		enabled: Boolean(token && tenantId && threadId),
		refetchInterval: POLL_MS,
	});
}

function useAfterSend(tenantId: string | null) {
	const queryClient = useQueryClient();
	return (detail: ThreadDetail) => {
		queryClient.setQueryData(messagesQueryKeys.thread(tenantId ?? "", detail.thread.id), detail);
		void queryClient.invalidateQueries({
			queryKey: [...messagesQueryKeys.root, tenantId, "threads"],
		});
		void queryClient.invalidateQueries({ queryKey: navigationQueryKeys.root });
	};
}

export function useReplyMutation(tenantId: string | null, threadId: string | null) {
	const { token } = useAuth();
	const afterSend = useAfterSend(tenantId);
	return useMutation({
		mutationFn: (body: string) =>
			messagesService.reply(requireToken(token), tenantId ?? "", threadId ?? "", body),
		onSuccess: afterSend,
	});
}

export function useStartThreadMutation(tenantId: string | null) {
	const { token } = useAuth();
	const afterSend = useAfterSend(tenantId);
	return useMutation({
		mutationFn: (body: { studentId: string; guardianId?: string; body: string }) =>
			messagesService.start(requireToken(token), tenantId ?? "", body),
		onSuccess: afterSend,
	});
}

export function useRecipientsQuery(tenantId: string | null, search: string, enabled: boolean) {
	const { token } = useAuth();
	return useQuery({
		queryKey: messagesQueryKeys.recipients(tenantId ?? "", search),
		queryFn: () => messagesService.recipients(requireToken(token), tenantId ?? "", search),
		enabled: enabled && Boolean(token && tenantId),
	});
}
