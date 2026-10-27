import { createHash } from 'node:crypto';

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import type { UserRecord } from '@/database/schema';
import { TenantsRepository } from '@/modules/tenants/tenants.repository';
import { MembershipsRepository } from './memberships.repository';

@Injectable()
export class MembershipInvitesService {
	constructor(
		private readonly memberships: MembershipsRepository,
		private readonly moduleRef: ModuleRef,
	) {}

	private get tenants(): TenantsRepository {
		return this.moduleRef.get(TenantsRepository, { strict: false });
	}

	async listPendingInvitesForUser(user: UserRecord) {
		await this.memberships.expireStaleInvites();
		const invites = await this.memberships.listPendingInvitesForEmail(user.email.toLowerCase());
		const results = [];
		for (const invite of invites) {
			if (invite.expiresAt <= new Date()) continue;
			// oxlint-disable-next-line no-await-in-loop -- a user has few invites; each is activated in order
			const tenant = await this.tenants.findById(invite.tenantId);
			if (!tenant) continue;
			results.push({
				inviteId: invite.id,
				tenantId: invite.tenantId,
				tenantName: tenant.name,
				email: invite.email,
				role: invite.role,
				expiresAt: invite.expiresAt.toISOString(),
			});
		}
		return { invites: results };
	}

	async previewInvite(token: string) {
		await this.memberships.expireStaleInvites();
		const invite = await this.memberships.findPendingInviteByTokenHash(hashInviteToken(token));
		if (!invite || invite.expiresAt <= new Date()) {
			throw new NotFoundException({
				code: 'INVITE_NOT_FOUND',
				message: 'Invite not found or expired',
			});
		}
		const tenant = await this.requireTenant(invite.tenantId);
		return {
			invite: {
				inviteId: invite.id,
				tenantId: invite.tenantId,
				tenantName: tenant.name,
				email: invite.email,
				role: invite.role,
				expiresAt: invite.expiresAt.toISOString(),
			},
		};
	}

	async acceptInvite(user: UserRecord, token: string) {
		await this.memberships.expireStaleInvites();
		const invite = await this.memberships.findPendingInviteByTokenHash(hashInviteToken(token));
		return this.acceptInviteRecord(user, invite);
	}

	async acceptInviteById(user: UserRecord, inviteId: string) {
		await this.memberships.expireStaleInvites();
		const invite = await this.memberships.findPendingInviteByIdGlobal(inviteId);
		return this.acceptInviteRecord(user, invite);
	}

	private async acceptInviteRecord(
		user: UserRecord,
		invite: Awaited<ReturnType<MembershipsRepository['findPendingInviteByIdGlobal']>>,
	) {
		if (!invite || invite.expiresAt <= new Date()) {
			throw new NotFoundException({
				code: 'INVITE_NOT_FOUND',
				message: 'Invite not found or expired',
			});
		}

		if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
			throw new ForbiddenException({
				code: 'INVITE_EMAIL_MISMATCH',
				message: 'Sign in with the email address that received the invite',
			});
		}

		const membership = await this.activateInviteForUser(user, invite);
		const tenant = await this.requireTenant(invite.tenantId);
		return {
			membership: {
				id: membership.id,
				tenantId: membership.tenantId,
				role: membership.role,
				status: membership.status,
			},
			tenant: { id: tenant.id, name: tenant.name },
		};
	}

	async applyPendingInvitesForUser(user: UserRecord) {
		await this.memberships.expireStaleInvites();
		const invites = await this.memberships.listPendingInvitesForEmail(user.email.toLowerCase());
		const activated = [];
		for (const invite of invites) {
			if (invite.expiresAt <= new Date()) continue;
			// oxlint-disable-next-line no-await-in-loop -- a user has few invites; each is activated in order
			const membership = await this.activateInviteForUser(user, invite);
			// oxlint-disable-next-line no-await-in-loop -- a user has few invites; each is activated in order
			const tenant = await this.tenants.findById(invite.tenantId);
			if (tenant) {
				activated.push({
					membershipId: membership.id,
					tenantId: tenant.id,
					tenantName: tenant.name,
					role: membership.role,
				});
			}
		}
		return activated;
	}

	private async activateInviteForUser(
		user: UserRecord,
		invite: NonNullable<Awaited<ReturnType<MembershipsRepository['findPendingInviteByTokenHash']>>>,
	) {
		let membership = invite.membershipId
			? await this.memberships.findById(invite.tenantId, invite.membershipId)
			: await this.memberships.findByTenantAndUser(invite.tenantId, user.id);

		if (membership) {
			membership = await this.memberships.update(invite.tenantId, membership.id, {
				status: 'active',
				role: invite.role,
				campusId: invite.campusId,
			});
		} else {
			membership = await this.memberships.create({
				tenantId: invite.tenantId,
				userId: user.id,
				role: invite.role,
				campusId: invite.campusId,
				status: 'active',
			});
		}

		if (!membership) {
			throw new Error('Failed to activate membership for invite');
		}

		await this.memberships.updateInvite(invite.id, {
			status: 'accepted',
			acceptedAt: new Date(),
			membershipId: membership.id,
		});

		return membership;
	}

	private async requireTenant(tenantId: string) {
		const tenant = await this.tenants.findById(tenantId);
		if (!tenant) {
			throw new NotFoundException({
				code: 'TENANT_NOT_FOUND',
				message: 'Organization not found',
			});
		}
		return tenant;
	}
}

export function hashInviteToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}
