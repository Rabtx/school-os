"use client";

import { UserAdd01Icon } from "@hugeicons/core-free-icons";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminPageShell } from "@/components/admin";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { AdmitStudentWizard } from "./admit-student-wizard";
import { NoAccess } from "@/components/states";

export function AdmissionsPage() {
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canWrite = can(PermissionCodes.STUDENTS_WRITE);
	const canInviteParent = can(PermissionCodes.TENANT_MEMBERSHIP_INVITE);

	const searchParams = useSearchParams();
	const [wizardOpen, setWizardOpen] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (searchParams.get("start") === "1" && canWrite) {
			setWizardOpen(true);
		}
	}, [searchParams, canWrite]);

	if (permissionsLoading) {
		return null;
	}

	if (!canWrite) {
		return (
			<NoAccess
				title="Admissions are not part of your role"
				description="Ask the principal or an admin if you need access."
			/>
		);
	}

	return (
		<AdminPageShell
			title="Admissions"
			description="Guided admission — student record, ID photo, guardian, and optional parent portal invite."
			icon={UserAdd01Icon}
			maxWidth="5xl"
		>
			{message ? (
				<Alert className="mb-4">
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			) : null}
			{error ? (
				<Alert variant="destructive" className="mb-4">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<div className="rounded-2xl border border-dashboard-border bg-dashboard-surface p-6">
				<h2 className="font-semibold text-dashboard-text-primary text-lg">New admission</h2>
				<p className="mt-2 max-w-lg text-dashboard-text-muted text-sm leading-relaxed">
					Walk through four quick steps: student details, optional portrait for ID cards, family
					contacts, then review and submit.
				</p>
				<Button type="button" className="mt-5" onClick={() => setWizardOpen(true)}>
					Start admission wizard
				</Button>
			</div>

			{tenantId ? (
				<AdmitStudentWizard
					open={wizardOpen}
					onOpenChange={setWizardOpen}
					tenantId={tenantId}
					campusId={campusId}
					canWrite={canWrite}
					canInviteParent={canInviteParent}
					onAdmitted={(text) => {
						setError(null);
						setMessage(text);
					}}
					onError={(text) => {
						setMessage(null);
						setError(text);
					}}
				/>
			) : null}
		</AdminPageShell>
	);
}
