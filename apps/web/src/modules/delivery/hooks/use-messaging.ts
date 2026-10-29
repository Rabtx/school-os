"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireToken } from "@/lib/api/require-token";
import { useAuth } from "@/modules/auth/context/auth-context";
import { deliveryService } from "../services/delivery.service";

const statusKey = (tenantId: string) => ["messaging", tenantId, "status"] as const;
const deliveriesKey = (tenantId: string) => ["messaging", tenantId, "deliveries"] as const;

/** WhatsApp connection and the last day's counts; refreshed each minute for the sidebar card. */
export function useMessagingStatusQuery(tenantId: string | null) {
	const { token } = useAuth();
	return useQuery({
		queryKey: statusKey(tenantId ?? ""),
		queryFn: () => deliveryService.status(requireToken(token), tenantId ?? ""),
		enabled: Boolean(token && tenantId),
		refetchInterval: 60_000,
	});
}

export function useRecentDeliveriesQuery(tenantId: string | null, enabled: boolean) {
	const { token } = useAuth();
	return useQuery({
		queryKey: deliveriesKey(tenantId ?? ""),
		queryFn: () => deliveryService.deliveries(requireToken(token), tenantId ?? ""),
		enabled: enabled && Boolean(token && tenantId),
		refetchInterval: 30_000,
	});
}

export function useWhatsAppConnection(tenantId: string | null) {
	const { token } = useAuth();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (connect: boolean) =>
			connect
				? deliveryService.connect(requireToken(token), tenantId ?? "")
				: deliveryService.disconnect(requireToken(token), tenantId ?? ""),
		onSuccess: (status) => queryClient.setQueryData(statusKey(tenantId ?? ""), status),
	});
}
