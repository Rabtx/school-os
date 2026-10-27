"use client";

import { useToast } from "@school-os/ui/components/toaster";
import { useQueryClient } from "@tanstack/react-query";
import { tenantQueryKeys } from "@/modules/tenants/queries/tenant-query-keys";
import {
	type OrganizationConfig,
	PermissionCodes,
	type UpdateOrganizationConfigInput,
	useOrganizationConfigQuery,
	usePermissions,
	useTenantContext,
	useUpdateOrganizationConfigMutation,
} from "@/modules/tenants";

/**
 * The tenant's organization config with a `save` that patches one field at a time.
 * Settings apply as they change (no Save button), so failures surface as a toast.
 */
export function useOrganizationSettings() {
	const toast = useToast();
	const { activeTenant } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.TENANT_SETTINGS_READ);
	const canWrite = can(PermissionCodes.TENANT_SETTINGS_WRITE);
	const query = useOrganizationConfigQuery(tenantId, canRead);
	const mutation = useUpdateOrganizationConfigMutation(tenantId ?? "");
	const queryClient = useQueryClient();

	async function save(input: UpdateOrganizationConfigInput) {
		// Show the new value at once; the server response (or a rollback) settles it.
		const key = tenantQueryKeys.organizationConfig(tenantId ?? "");
		const previous = queryClient.getQueryData<OrganizationConfig>(key);
		if (previous) {
			queryClient.setQueryData<OrganizationConfig>(key, {
				settings: { ...previous.settings, ...input.settings },
				branding: { ...previous.branding, ...input.branding },
				communicationPolicy: { ...previous.communicationPolicy, ...input.communicationPolicy },
			});
		}
		try {
			await mutation.mutateAsync(input);
		} catch (error) {
			if (previous) queryClient.setQueryData(key, previous);
			toast.show({
				title: "Setting not saved",
				description: error instanceof Error ? error.message : "Try again in a moment.",
				status: "error",
			});
		}
	}

	return {
		tenantId,
		config: query.data,
		loading: permissionsLoading || query.isLoading,
		canRead,
		canWrite,
		saving: mutation.isPending,
		save,
	};
}
