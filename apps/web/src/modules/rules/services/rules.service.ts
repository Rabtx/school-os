import { apiClient } from "@/lib/api/client";
import type { AttendancePolicy, AttendancePolicyView } from "../types/rules.types";

export const rulesService = {
	attendance: (accessToken: string, tenantId: string) =>
		apiClient.get<AttendancePolicyView>(`/tenants/${tenantId}/rules/attendance`, { accessToken }),
	updateAttendance: (accessToken: string, tenantId: string, policy: AttendancePolicy) =>
		apiClient.put<AttendancePolicyView>(`/tenants/${tenantId}/rules/attendance`, policy, {
			accessToken,
		}),
};
