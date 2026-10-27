"use client";

import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Spinner } from "@school-os/ui/components/spinner";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth";
import { SettingsHeader, SettingsRow, SettingsSection } from "@/modules/settings";
import {
	type MembershipRole,
	membershipRoleLabels,
	PermissionCodes,
	usePermissions,
	useTenantContext,
} from "@/modules/tenants";
import { useMembersQuery } from "../hooks/use-member-queries";
import { useMembersActions } from "../hooks/use-members-actions";
import type { Member } from "../types/member.types";
import { computeMemberInsights } from "../utils/member-ui.utils";
import { InviteMemberSheet } from "./invite-member-sheet";
import { MemberDetailSheet } from "./member-detail-sheet";
import { MembersDirectory } from "./members-directory";
import { type MembersFilters, MembersToolbar } from "./members-toolbar";
import { PendingInvitesSection } from "./pending-invites-section";
import { RoleAccessPanel } from "./role-access-panel";

const ROLE_ORDER: MembershipRole[] = [
	"owner",
	"principal",
	"vice_principal",
	"admin",
	"teacher",
	"parent",
	"student",
];

/** What each role reaches, in the frame's short form. */
const ROLE_SCOPE: Record<MembershipRole, string> = {
	owner: "sees everything, billing and ownership",
	principal: "everything in school",
	vice_principal: "daily operations and approvals",
	admin: "members, campuses and records",
	teacher: "their own classes",
	parent: "their children only",
	student: "their own work",
};

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
	// `?invite=1` (the sidebar's "Invite staff") opens the invite sheet once access is known.
	const inviteRequested = useSearchParams().get("invite") === "1";
	const canInvite = Boolean(membersQuery.data?.actor.canInvite);
	useEffect(() => {
		if (inviteRequested && canInvite) setInviteOpen(true);
	}, [inviteRequested, canInvite]);
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
				const roleDiff = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
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

	const roleCounts = new Map<MembershipRole, number>();
	for (const member of members) {
		if (member.status === "suspended") continue;
		for (const role of new Set([member.role, ...member.roles])) {
			roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
		}
	}
	const rolesInUse = ROLE_ORDER.filter((role) => roleCounts.has(role));
	const peopleInRoles = members.filter((member) => member.status !== "suspended").length;

	const showRole = (role: MembershipRole) => {
		setFilters((prev) => ({ ...prev, role, status: "all", query: "" }));
		document.getElementById("people")?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	return (
		<div className="min-w-0">
			<SettingsHeader
				title="Members and roles"
				description="Who can do what. The owner and principal decide roles above teacher."
			/>

			{pendingInvites.length > 0 ? (
				<div className="mb-8 flex flex-wrap items-center gap-3 rounded-[12px] border border-[color-mix(in_oklab,var(--rx-accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--rx-accent)_10%,transparent)] px-4 py-3">
					<p className="min-w-0 flex-1 text-[14px] text-dashboard-text-primary leading-5">
						{pendingInvites.length} {pendingInvites.length === 1 ? "invite is" : "invites are"}{" "}
						waiting to be accepted
						{insights.expiringSoon > 0 ? `, ${insights.expiringSoon} expiring soon` : ""}.
					</p>
					<a
						href="#invites"
						className="inline-flex h-7 items-center rounded-[6px] bg-[var(--rx-accent)] px-3 font-medium text-[13px] text-white hover:opacity-90"
					>
						Review invites
					</a>
				</div>
			) : null}

			<SettingsSection
				title="Roles"
				description={
					membersQuery.isLoading
						? "Loading…"
						: `${peopleInRoles} ${peopleInRoles === 1 ? "person" : "people"} across ${rolesInUse.length} ${rolesInUse.length === 1 ? "role" : "roles"}.`
				}
			>
				{rolesInUse.map((role) => {
					const count = roleCounts.get(role) ?? 0;
					return (
						<SettingsRow
							key={role}
							label={membershipRoleLabels[role]}
							description={`${count} ${count === 1 ? "person" : "people"} · ${ROLE_SCOPE[role]}`}
						>
							<button
								type="button"
								onClick={() => showRole(role)}
								className="inline-flex h-7 items-center rounded-[6px] border border-dashboard-border-strong px-2.5 text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
							>
								View people
							</button>
						</SettingsRow>
					);
				})}
				{!membersQuery.isLoading && rolesInUse.length === 0 ? (
					<p className="py-6 text-center text-[13px] text-dashboard-text-dim">No members yet.</p>
				) : null}
			</SettingsSection>

			<section id="people" className="mb-8 scroll-mt-4">
				<div className="mb-3">
					<h2 className="font-medium text-[14px] text-dashboard-text-primary leading-5">People</h2>
					<p className="text-[12px] text-dashboard-text-dim leading-4">
						Open someone to change their role, campus or status.
					</p>
				</div>
				<div className="overflow-hidden rounded-[12px] border border-dashboard-border bg-dashboard-surface">
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
			</section>

			<div id="invites" className="mb-8 scroll-mt-4">
				<PendingInvitesSection
					invites={pendingInvites}
					canInvite={Boolean(actor?.canInvite)}
					onResend={(id, email) => void actions.resendInvite(id, email)}
					onRevoke={(id, email) => void actions.revokeInvite(id, email)}
					pending={actions.isPending}
				/>
			</div>

			<RoleAccessPanel />

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
