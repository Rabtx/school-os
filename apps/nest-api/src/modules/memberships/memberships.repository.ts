import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	type MembershipRecord,
	membershipInvites,
	membershipRoles,
	memberships,
	users,
} from '@/database/schema';

import { managementRoles } from './membership-roles';

@Injectable()
export class MembershipsRepository {
	constructor(private readonly database: DatabaseService) {}

	async findActiveByTenantAndUser(tenantId: string, userId: string) {
		const [membership] = await this.database.db
			.select()
			.from(memberships)
			.where(
				and(
					eq(memberships.tenantId, tenantId),
					eq(memberships.userId, userId),
					eq(memberships.status, 'active'),
				),
			)
			.limit(1);
		return membership ?? null;
	}

	async findByTenantAndUser(tenantId: string, userId: string) {
		const [membership] = await this.database.db
			.select()
			.from(memberships)
			.where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
			.limit(1);
		return membership ?? null;
	}

	async findById(tenantId: string, membershipId: string) {
		const [membership] = await this.database.db
			.select()
			.from(memberships)
			.where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
			.limit(1);
		return membership ?? null;
	}

	async findActiveById(membershipId: string) {
		const [membership] = await this.database.db
			.select()
			.from(memberships)
			.where(and(eq(memberships.id, membershipId), eq(memberships.status, 'active')))
			.limit(1);
		return membership ?? null;
	}

	async countActiveForUser(userId: string) {
		const rows = await this.listActiveTenantIdsForUser(userId);
		return rows.length;
	}

	async countActiveOwnedTenantsForUser(userId: string) {
		const rows = await this.database.db
			.select({ id: memberships.id })
			.from(memberships)
			.where(
				and(
					eq(memberships.userId, userId),
					eq(memberships.role, 'owner'),
					eq(memberships.status, 'active'),
				),
			);
		return rows.length;
	}

	async listActiveTenantIdsForUser(userId: string) {
		const rows = await this.database.db
			.select({ tenantId: memberships.tenantId })
			.from(memberships)
			.where(and(eq(memberships.userId, userId), eq(memberships.status, 'active')));
		return rows.map((row) => row.tenantId);
	}

	async listMembersForTenant(tenantId: string) {
		return this.database.db
			.select({
				membership: memberships,
				user: {
					id: users.id,
					email: users.email,
					username: users.username,
					emailVerified: users.emailVerifiedAt,
				},
			})
			.from(memberships)
			.innerJoin(users, eq(memberships.userId, users.id))
			.where(eq(memberships.tenantId, tenantId))
			.orderBy(asc(users.email));
	}

	async countActiveOwners(tenantId: string, excludeMembershipId?: string) {
		const conditions = [
			eq(memberships.tenantId, tenantId),
			eq(memberships.role, 'owner'),
			eq(memberships.status, 'active'),
		];
		const rows = await this.database.db
			.select({ id: memberships.id })
			.from(memberships)
			.where(and(...conditions));
		if (!excludeMembershipId) return rows.length;
		return rows.filter((row) => row.id !== excludeMembershipId).length;
	}

	async create(input: typeof memberships.$inferInsert) {
		const [membership] = await this.database.db.insert(memberships).values(input).returning();
		if (!membership) throw new Error('Membership insert did not return a record');
		await this.database.db
			.insert(membershipRoles)
			.values({ membershipId: membership.id, role: membership.role })
			.onConflictDoNothing();
		return membership;
	}

	async update(
		tenantId: string,
		membershipId: string,
		input: Partial<typeof memberships.$inferInsert>,
	) {
		const [membership] = await this.database.db
			.update(memberships)
			.set({ ...input, updatedAt: new Date() })
			.where(and(eq(memberships.id, membershipId), eq(memberships.tenantId, tenantId)))
			.returning();
		if (membership?.role) {
			await this.database.db
				.insert(membershipRoles)
				.values({ membershipId: membership.id, role: membership.role })
				.onConflictDoNothing();
		}
		return membership ?? null;
	}

	async listRolesForMembership(membershipId: string) {
		return this.database.db
			.select()
			.from(membershipRoles)
			.where(eq(membershipRoles.membershipId, membershipId));
	}

	/**
	 * Whether the user holds a management role in at least one active membership. Reads
	 * `membership_roles` (not `memberships.role`) so dual-role members are not missed.
	 */
	async hasActiveManagementRoleForUser(userId: string) {
		const [row] = await this.database.db
			.select({ id: memberships.id })
			.from(memberships)
			.innerJoin(membershipRoles, eq(membershipRoles.membershipId, memberships.id))
			.where(
				and(
					eq(memberships.userId, userId),
					eq(memberships.status, 'active'),
					inArray(membershipRoles.role, [...managementRoles]),
				),
			)
			.limit(1);
		return row !== undefined;
	}

	async listRolesForMembershipIds(membershipIds: string[]) {
		if (membershipIds.length === 0) return [];
		return this.database.db
			.select()
			.from(membershipRoles)
			.where(inArray(membershipRoles.membershipId, membershipIds));
	}

	async addRole(membershipId: string, role: MembershipRecord['role']) {
		const [row] = await this.database.db
			.insert(membershipRoles)
			.values({ membershipId, role })
			.onConflictDoNothing()
			.returning();
		return row ?? null;
	}

	async removeRole(membershipId: string, role: MembershipRecord['role']) {
		await this.database.db
			.delete(membershipRoles)
			.where(and(eq(membershipRoles.membershipId, membershipId), eq(membershipRoles.role, role)));
	}

	async createInvite(input: typeof membershipInvites.$inferInsert) {
		const [invite] = await this.database.db.insert(membershipInvites).values(input).returning();
		if (!invite) throw new Error('Membership invite insert did not return a record');
		return invite;
	}

	async findPendingInviteByTokenHash(tokenHash: string) {
		const [invite] = await this.database.db
			.select()
			.from(membershipInvites)
			.where(
				and(eq(membershipInvites.tokenHash, tokenHash), eq(membershipInvites.status, 'pending')),
			)
			.limit(1);
		return invite ?? null;
	}

	async findPendingInviteByTenantAndEmail(tenantId: string, email: string) {
		const [invite] = await this.database.db
			.select()
			.from(membershipInvites)
			.where(
				and(
					eq(membershipInvites.tenantId, tenantId),
					eq(membershipInvites.email, email),
					eq(membershipInvites.status, 'pending'),
				),
			)
			.limit(1);
		return invite ?? null;
	}

	async listPendingInvitesForTenant(tenantId: string) {
		return this.database.db
			.select()
			.from(membershipInvites)
			.where(and(eq(membershipInvites.tenantId, tenantId), eq(membershipInvites.status, 'pending')))
			.orderBy(asc(membershipInvites.email));
	}

	async findPendingInviteById(tenantId: string, inviteId: string) {
		const [invite] = await this.database.db
			.select()
			.from(membershipInvites)
			.where(
				and(
					eq(membershipInvites.id, inviteId),
					eq(membershipInvites.tenantId, tenantId),
					eq(membershipInvites.status, 'pending'),
				),
			)
			.limit(1);
		return invite ?? null;
	}

	async findPendingInviteByIdGlobal(inviteId: string) {
		const [invite] = await this.database.db
			.select()
			.from(membershipInvites)
			.where(and(eq(membershipInvites.id, inviteId), eq(membershipInvites.status, 'pending')))
			.limit(1);
		return invite ?? null;
	}

	/**
	 * Accepts an invite atomically: the claim updates the invite only while it is still pending and
	 * unexpired, so exactly one concurrent accept wins; the membership is activated (or created) in
	 * the same transaction. Returns `null` when the invite was already consumed or has expired.
	 */
	async acceptInviteAtomically(input: {
		inviteId: string;
		userId: string;
	}): Promise<AcceptedInvite | null> {
		return this.database.db.transaction(async (transaction) => {
			const [invite] = await transaction
				.update(membershipInvites)
				.set({ status: 'accepted', acceptedAt: new Date(), updatedAt: new Date() })
				.where(
					and(
						eq(membershipInvites.id, input.inviteId),
						eq(membershipInvites.status, 'pending'),
						sql`${membershipInvites.expiresAt} > now()`,
					),
				)
				.returning();
			if (!invite) return null;

			let [membership] = invite.membershipId
				? await transaction
						.select()
						.from(memberships)
						.where(
							and(
								eq(memberships.id, invite.membershipId),
								eq(memberships.tenantId, invite.tenantId),
							),
						)
						.limit(1)
				: [];
			if (!membership) {
				[membership] = await transaction
					.select()
					.from(memberships)
					.where(
						and(eq(memberships.tenantId, invite.tenantId), eq(memberships.userId, input.userId)),
					)
					.limit(1);
			}

			if (membership) {
				[membership] = await transaction
					.update(memberships)
					.set({
						status: 'active',
						role: invite.role,
						campusId: invite.campusId,
						updatedAt: new Date(),
					})
					.where(eq(memberships.id, membership.id))
					.returning();
				// Keep `membership_roles` in sync with the activated role (as memberships.update does).
				await transaction
					.insert(membershipRoles)
					.values({ membershipId: membership.id, role: membership.role })
					.onConflictDoNothing();
			} else {
				[membership] = await transaction
					.insert(memberships)
					.values({
						tenantId: invite.tenantId,
						userId: input.userId,
						role: invite.role,
						campusId: invite.campusId,
						status: 'active',
					})
					.returning();
				await transaction
					.insert(membershipRoles)
					.values({ membershipId: membership.id, role: membership.role })
					.onConflictDoNothing();
			}
			if (!membership) {
				throw new Error('Membership activation for invite did not return a record');
			}

			await transaction
				.update(membershipInvites)
				.set({ membershipId: membership.id, updatedAt: new Date() })
				.where(eq(membershipInvites.id, invite.id));

			return { invite, membership };
		});
	}

	async listPendingInvitesForEmail(email: string) {
		return this.database.db
			.select()
			.from(membershipInvites)
			.where(and(eq(membershipInvites.email, email), eq(membershipInvites.status, 'pending')))
			.orderBy(asc(membershipInvites.createdAt));
	}

	async updateInvite(inviteId: string, input: Partial<typeof membershipInvites.$inferInsert>) {
		const [invite] = await this.database.db
			.update(membershipInvites)
			.set({ ...input, updatedAt: new Date() })
			.where(eq(membershipInvites.id, inviteId))
			.returning();
		return invite ?? null;
	}

	async expireStaleInvites() {
		await this.database.db
			.update(membershipInvites)
			.set({ status: 'expired', updatedAt: new Date() })
			.where(
				and(eq(membershipInvites.status, 'pending'), sql`${membershipInvites.expiresAt} < now()`),
			);
	}
}

export type TenantMemberRow = MembershipRecord & {
	user: { id: string; email: string; username: string; emailVerified: Date | null };
};

export type AcceptedInvite = {
	invite: typeof membershipInvites.$inferSelect;
	membership: MembershipRecord;
};
