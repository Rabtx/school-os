"use client";

import { useToast } from "@school-os/ui/components/toaster";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireToken } from "@/lib/api/require-token";
import { useAuth } from "@/modules/auth/context/auth-context";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { rulesService } from "../services/rules.service";
import type { AttendancePolicy, AttendancePolicyView } from "../types/rules.types";

const attendancePolicyKey = (tenantId: string) => ["rules", tenantId, "attendance"] as const;

/**
 * The school's attendance rules with a `save` that sends the whole policy as a new version.
 * Changes apply as they are made; a rejected one (say, a late time after roll call closes) rolls
 * back and says why.
 */
export function useAttendancePolicy() {
	const { token } = useAuth();
	const toast = useToast();
	const queryClient = useQueryClient();
	const { activeTenant } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? "";
	const canRead = can(PermissionCodes.TENANT_SETTINGS_READ);
	const canWrite = can(PermissionCodes.TENANT_SETTINGS_WRITE);
	const key = attendancePolicyKey(tenantId);

	const query = useQuery({
		queryKey: key,
		queryFn: () => rulesService.attendance(requireToken(token), tenantId),
		enabled: Boolean(token && tenantId && canRead),
	});

	const mutation = useMutation({
		mutationFn: (policy: AttendancePolicy) =>
			rulesService.updateAttendance(requireToken(token), tenantId, policy),
		onSuccess: (view) => {
			queryClient.setQueryData(key, view);
			// Roll call shows the times and the edit window from these rules.
			void queryClient.invalidateQueries({ queryKey: ["attendance"] });
		},
	});

	async function save(change: Partial<AttendancePolicy>) {
		const previous = queryClient.getQueryData<AttendancePolicyView>(key);
		if (!previous) return;
		const policy = { ...previous.policy, ...change };
		queryClient.setQueryData<AttendancePolicyView>(key, { ...previous, policy });
		try {
			await mutation.mutateAsync(policy);
		} catch (error) {
			queryClient.setQueryData(key, previous);
			toast.show({
				title: "Rule not saved",
				description: ruleErrorMessage(error),
				status: "error",
			});
		}
	}

	return {
		view: query.data,
		loading: permissionsLoading || query.isLoading,
		canRead,
		canWrite,
		save,
	};
}

/** The first field message the API gave (say, the late time must be before roll call closes). */
function ruleErrorMessage(error: unknown): string {
	const fieldMessage = (error as { errors?: ReadonlyArray<{ message?: string }> } | null)
		?.errors?.[0]?.message;
	if (fieldMessage) return fieldMessage;
	return error instanceof Error ? error.message : "Try again in a moment.";
}
