import { apiClient } from "@/lib/api/client";
import type { DeliveryLogItem, MessagingStatus } from "../types/delivery.types";

const base = (tenantId: string) => `/tenants/${tenantId}/messaging`;

export const deliveryService = {
	status: (accessToken: string, tenantId: string) =>
		apiClient.get<MessagingStatus>(`${base(tenantId)}/status`, { accessToken }),
	deliveries: (accessToken: string, tenantId: string) =>
		apiClient.get<{ deliveries: DeliveryLogItem[] }>(`${base(tenantId)}/deliveries`, {
			accessToken,
		}),
	connect: (accessToken: string, tenantId: string) =>
		apiClient.post<MessagingStatus>(`${base(tenantId)}/whatsapp/connect`, {}, { accessToken }),
	disconnect: (accessToken: string, tenantId: string) =>
		apiClient.post<MessagingStatus>(`${base(tenantId)}/whatsapp/disconnect`, {}, { accessToken }),
};
