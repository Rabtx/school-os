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

		const claimed = await this.memberships.acceptInviteAtomically({
			inviteId: invite.id,
			userId: user.id,
		});
		// `null` means another request consumed the invite (or it expired) between the read and the
		// claim; the caller sees the same answer as any other unusable invite.
		if (!claimed) {
			throw new NotFoundException({
				code: 'INVITE_NOT_FOUND',
				message: 'Invite not found or expired',
			});
		}

		const tenant = await this.requireTenant(claimed.invite.tenantId);
		return {
			membership: {
				id: claimed.membership.id,
				tenantId: claimed.membership.tenantId,
				role: claimed.membership.role,
				status: claimed.membership.status,
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
			// oxlint-disable-next-line no-await-in-loop -- a user has few invites; each is claimed in order
			const claimed = await this.memberships.acceptInviteAtomically({
				inviteId: invite.id,
				userId: user.id,
			});
			// Consumed concurrently or expired since the read; nothing to apply.
			if (!claimed) continue;
			// oxlint-disable-next-line no-await-in-loop -- a user has few invites; each is activated in order
			const tenant = await this.tenants.findById(claimed.invite.tenantId);
			if (tenant) {
				activated.push({
					membershipId: claimed.membership.id,
					tenantId: tenant.id,
					tenantName: tenant.name,
					role: claimed.membership.role,
				});
			}
		}
		return activated;
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
