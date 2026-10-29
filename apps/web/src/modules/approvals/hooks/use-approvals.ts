"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireToken } from "@/lib/api/require-token";
import { useAuth } from "@/modules/auth/context/auth-context";
import { navigationQueryKeys } from "@/modules/navigation/queries/navigation-query-keys";
import { approvalsQueryKeys } from "../queries/approvals-query-keys";
import { approvalsService } from "../services/approvals.service";
import type { AttendanceChangeInput, LeaveInput, MarksChangeInput } from "../types/approvals.types";

export function useApprovalQueueQuery(tenantId: string | null, enabled = true) {
	const { token } = useAuth();
	return useQuery({
		queryKey: approvalsQueryKeys.queue(tenantId ?? ""),
		queryFn: () => approvalsService.queue(requireToken(token), tenantId ?? ""),
		enabled: enabled && Boolean(token && tenantId),
	});
}

export function useMyApprovalsQuery(tenantId: string | null, enabled = true) {
	const { token } = useAuth();
	return useQuery({
		queryKey: approvalsQueryKeys.mine(tenantId ?? ""),
		queryFn: () => approvalsService.mine(requireToken(token), tenantId ?? ""),
		enabled: enabled && Boolean(token && tenantId),
	});
}

/** After any decision: the queue, the requester's list, the sidebar count and the roll call. */
function useRefreshAfterDecision() {
	const queryClient = useQueryClient();
	return () => {
		void queryClient.invalidateQueries({ queryKey: approvalsQueryKeys.root });
		void queryClient.invalidateQueries({ queryKey: navigationQueryKeys.root });
		void queryClient.invalidateQueries({ queryKey: ["attendance"] });
	};
}

export function useApprovalDecisions(tenantId: string | null) {
	const { token } = useAuth();
	const refresh = useRefreshAfterDecision();
	const id = tenantId ?? "";
	const approve = useMutation({
		mutationFn: (approvalId: string) =>
			approvalsService.approve(requireToken(token), id, approvalId),
		onSettled: refresh,
	});
	const decline = useMutation({
		mutationFn: ({ approvalId, reason }: { approvalId: string; reason: string }) =>
			approvalsService.decline(requireToken(token), id, approvalId, reason),
		onSettled: refresh,
	});
	const undo = useMutation({
		mutationFn: (approvalId: string) => approvalsService.undo(requireToken(token), id, approvalId),
		onSettled: refresh,
	});
	return { approve, decline, undo };
}

/** Asks leadership to decide something; the request type's handler checks who may ask. */
export function useCreateApproval<Input extends object>(tenantId: string | null, type: string) {
	const { token } = useAuth();
	const refresh = useRefreshAfterDecision();
	return useMutation({
		mutationFn: ({ input, note }: { input: Input; note?: string }) =>
			approvalsService.create(requireToken(token), tenantId ?? "", {
				type,
				input,
				note: note || undefined,
			}),
		onSuccess: refresh,
	});
}

export function useRequestAttendanceChange(tenantId: string | null) {
	return useCreateApproval<AttendanceChangeInput>(tenantId, "attendance_change");
}

export function useCancelApproval(tenantId: string | null) {
	const { token } = useAuth();
	const refresh = useRefreshAfterDecision();
	return useMutation({
		mutationFn: (approvalId: string) =>
			approvalsService.cancel(requireToken(token), tenantId ?? "", approvalId),
		onSuccess: refresh,
	});
}

export function useRequestLeave(tenantId: string | null) {
	return useCreateApproval<LeaveInput>(tenantId, "leave");
}

export function useRequestMarksChange(tenantId: string | null) {
	return useCreateApproval<MarksChangeInput>(tenantId, "marks_change");
}
