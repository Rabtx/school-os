"use client";

import { UserMultiple02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription, AlertTitle } from "@school-os/ui/components/alert";
import { Spinner } from "@school-os/ui/components/spinner";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { useMembersQuery } from "../hooks/use-member-queries";
import { useMembersActions } from "../hooks/use-members-actions";
import type { Member } from "../types/member.types";
import { computeMemberInsights } from "../utils/member-ui.utils";
import { InviteMemberSheet } from "./invite-member-sheet";
import { MemberDetailSheet } from "./member-detail-sheet";
import { MembersDirectory } from "./members-directory";
import { MembersInsightsStrip } from "./members-insights-strip";
import { type MembersFilters, MembersToolbar } from "./members-toolbar";
import { PendingInvitesSection } from "./pending-invites-section";
import { RoleAccessPanel } from "./role-access-panel";

const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

function FadeIn({
	children,
	delay = 0,
	className,
}: {
	children: React.ReactNode;
	delay?: number;
	className?: string;
}) {
	const reduce = useReducedMotion();
	return (
		<motion.div
			className={cn("min-w-0", className)}
			initial={reduce ? false : { opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.4, ease: EASE_OUT, delay }}
		>
			{children}
		</motion.div>
	);
}

export function MembersPage() {
	const { activeTenant, campuses } = useTenantContext();
	const { tenantContext } = useAuth();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const canRead = can(PermissionCodes.TENANT_MEMBERSHIP_READ);

	const membersQuery = useMembersQuery(tenantId, canRead);
	const actions = useMembersActions(tenantId ?? "");

	const [filters, setFilters] = useState<MembersFilters>({
		query: "",
		status: "all",
		role: "all",
		campusId: "all",
	});
	const [inviteOpen, setInviteOpen] = useState(false);
	const [selectedMember, setSelectedMember] = useState<Member | null>(null);
	const [detailOpen, setDetailOpen] = useState(false);

	const members = useMemo(() => membersQuery.data?.members ?? [], [membersQuery.data]);
	const pendingInvites = useMemo(
		() => membersQuery.data?.pendingInvites ?? [],
		[membersQuery.data],
	);
	const summary = membersQuery.data?.summary;
	const actor = membersQuery.data?.actor;
	const currentMembershipId = tenantContext?.id ?? null;

	const insights = useMemo(
		() => computeMemberInsights(members, pendingInvites, summary),
		[members, pendingInvites, summary],
	);

	const filteredMembers = useMemo(() => {
		const query = filters.query.trim().toLowerCase();
		return members
			.filter((member) => filters.status === "all" || member.status === filters.status)
			.filter((member) => filters.role === "all" || member.role === filters.role)
			.filter((member) => filters.campusId === "all" || member.campusId === filters.campusId)
			.filter((member) => {
				if (!query) return true;
				return (
					member.email.toLowerCase().includes(query) ||
					member.username.toLowerCase().includes(query) ||
					(member.campusName?.toLowerCase().includes(query) ?? false) ||
					member.role.includes(query)
				);
			})
			.toSorted((a, b) => {
				const roleOrder = [
					"owner",
					"principal",
					"vice_principal",
					"admin",
					"teacher",
					"parent",
					"student",
				];
				const roleDiff = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role);
				if (roleDiff !== 0) return roleDiff;
				return a.email.localeCompare(b.email);
			});
	}, [members, filters]);

	function openMember(member: Member) {
		setSelectedMember(member);
		setDetailOpen(true);
	}

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to manage members.</AlertDescription>
			</Alert>
		);
	}

	if (permissionsLoading) {
		return (
			<div className="flex min-h-[240px] items-center justify-center">
				<Spinner className="size-6" />
			</div>
		);
	}

	if (!canRead) {
		return (
			<Alert>
				<AlertDescription>
					You do not have permission to view organization members.
				</AlertDescription>
			</Alert>
		);
	}

	return (
		<div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-4 px-3 py-3 sm:space-y-5 sm:px-6 sm:py-6 lg:space-y-6 lg:px-8">
			<FadeIn>
				<section className="flex flex-col gap-3 border-dashboard-border border-b pb-4 sm:gap-4 sm:pb-5 md:flex-row md:items-end md:justify-between">
					<div className="min-w-0">
						<div className="mb-1.5 flex items-center gap-2 text-[11px] text-dashboard-text-muted uppercase tracking-[0.08em]">
							<span className="size-1.5 rounded-full bg-dashboard-accent" />
							<span>People · Access control</span>
						</div>
						<div className="flex items-center gap-3">
							<div className="flex size-10 items-center justify-center rounded-xl bg-dashboard-accent-soft text-dashboard-accent">
								<HugeiconsIcon icon={UserMultiple02Icon} size={20} strokeWidth={2} />
							</div>
							<div>
								<h1 className="font-semibold text-[22px] text-dashboard-text-primary leading-tight tracking-tight sm:text-[24px]">
									Members
								</h1>
								<p className="mt-1 text-[13px] text-dashboard-text-secondary leading-5">
									{activeTenant?.name ?? "Organization"} · roles, campuses, and secure invites
								</p>
							</div>
						</div>
					</div>
					{insights.expiringSoon > 0 ? (
						<Alert className="max-w-md border-destructive/25 bg-destructive/10">
							<AlertTitle className="text-destructive">Invites expiring soon</AlertTitle>
							<AlertDescription className="text-destructive/90">
								{insights.expiringSoon} invite{insights.expiringSoon === 1 ? "" : "s"} expiring soon
								— resend to keep onboarding on track.
							</AlertDescription>
						</Alert>
					) : null}
				</section>
			</FadeIn>

			<FadeIn delay={0.04}>
				<MembersInsightsStrip insights={insights} loading={membersQuery.isLoading} />
			</FadeIn>

			<FadeIn delay={0.08}>
				<div className="overflow-hidden rounded-[14px] border border-dashboard-border bg-dashboard-surface">
					<MembersToolbar
						filters={filters}
						onFiltersChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
						campuses={campuses}
						canInvite={Boolean(actor?.canInvite)}
						onInvite={() => setInviteOpen(true)}
						resultCount={filteredMembers.length}
						totalCount={members.length}
					/>
					<MembersDirectory
						members={filteredMembers}
						loading={membersQuery.isLoading}
						actor={actor}
						currentMembershipId={currentMembershipId}
						onSelect={openMember}
						onResendInvite={(inviteId, email) => void actions.resendInvite(inviteId, email)}
					/>
				</div>
			</FadeIn>

			<FadeIn delay={0.12}>
				<PendingInvitesSection
					invites={pendingInvites}
					canInvite={Boolean(actor?.canInvite)}
					onResend={(id, email) => void actions.resendInvite(id, email)}
					onRevoke={(id, email) => void actions.revokeInvite(id, email)}
					pending={actions.isPending}
				/>
			</FadeIn>

			<FadeIn delay={0.16}>
				<RoleAccessPanel />
			</FadeIn>

			<InviteMemberSheet
				open={inviteOpen}
				onOpenChange={setInviteOpen}
				campuses={campuses}
				invitableRoles={actor?.invitableRoles ?? []}
				onSubmit={async (input) => {
					await actions.invite(input);
				}}
				pending={actions.isPending}
			/>

			<MemberDetailSheet
				member={selectedMember}
				open={detailOpen}
				onOpenChange={setDetailOpen}
				actor={actor}
				campuses={campuses}
				isSelf={selectedMember?.id === currentMembershipId}
				onSave={async (id, input) => {
					await actions.update(id, input);
				}}
				onAddRole={async (id, role, email) => {
					await actions.addRole(id, role, email);
				}}
				onResendInvite={async (id, email) => {
					await actions.resendInvite(id, email);
				}}
				pending={actions.isPending}
			/>
		</div>
	);
}
