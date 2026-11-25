import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MembershipInviteRecord } from '@/database/schema';
import type { MembershipRecord, UserRecord } from '@/database/schema';
import { MembershipsRepository } from './memberships.repository';
import { MembershipInvitesService } from './membership-invites.service';

function membership(): MembershipRecord {
	return {
		id: 'membership-1',
		tenantId: 'tenant-1',
		userId: 'user-1',
		campusId: null,
		role: 'teacher',
		status: 'active',
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

describe('MembershipInvitesService', () => {
	let service: MembershipInvitesService;
	let membershipsRepository: {
		acceptInviteAtomically: ReturnType<typeof vi.fn>;
		expireStaleInvites: ReturnType<typeof vi.fn>;
		findPendingInviteByIdGlobal: ReturnType<typeof vi.fn>;
		findPendingInviteByTokenHash: ReturnType<typeof vi.fn>;
		listPendingInvitesForEmail: ReturnType<typeof vi.fn>;
	};
	let tenantsRepository: { findById: ReturnType<typeof vi.fn> };

	const futureDate = new Date('2026-12-31T00:00:00.000Z');
	const user: UserRecord = {
		id: 'user-1',
		email: 'user@example.com',
		username: 'user-1',
		passwordHash: null,
		emailVerifiedAt: new Date(),
		isActive: true,
		failedLoginAttempts: 0,
		lockedUntil: null,
		passwordChangedAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
	};

	function pendingInvite(overrides: Partial<MembershipInviteRecord> = {}): MembershipInviteRecord {
		return {
			id: 'invite-1',
			tenantId: 'tenant-1',
			email: 'user@example.com',
			role: 'teacher',
			campusId: null,
			invitedByMembershipId: null,
			membershipId: null,
			tokenHash: 'hash-1',
			status: 'pending',
			expiresAt: futureDate,
			acceptedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			...overrides,
		};
	}

	beforeEach(() => {
		membershipsRepository = {
			acceptInviteAtomically: vi.fn(),
			expireStaleInvites: vi.fn().mockResolvedValue(undefined),
			findPendingInviteByIdGlobal: vi.fn(),
			findPendingInviteByTokenHash: vi.fn(),
			listPendingInvitesForEmail: vi.fn().mockResolvedValue([]),
		};
		tenantsRepository = { findById: vi.fn() };

		service = new MembershipInvitesService(
			membershipsRepository as unknown as MembershipsRepository,
			{
				get: vi.fn().mockReturnValue(tenantsRepository),
			} as never,
		);
	});

	it('rejects an unknown or consumed token with INVITE_NOT_FOUND', async () => {
		membershipsRepository.findPendingInviteByTokenHash.mockResolvedValue(null);

		await expect(service.acceptInvite(user, 'token')).rejects.toBeInstanceOf(NotFoundException);
		expect(membershipsRepository.acceptInviteAtomically).not.toHaveBeenCalled();
	});

	it('rejects an expired invite', async () => {
		membershipsRepository.findPendingInviteByTokenHash.mockResolvedValue(
			pendingInvite({ expiresAt: new Date('2026-01-01T00:00:00.000Z') }),
		);

		await expect(service.acceptInvite(user, 'token')).rejects.toBeInstanceOf(NotFoundException);
	});

	it('rejects a different email with INVITE_EMAIL_MISMATCH', async () => {
		membershipsRepository.findPendingInviteByTokenHash.mockResolvedValue(pendingInvite());

		await expect(
			service.acceptInvite({ ...user, email: 'other@example.com' }, 'token'),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('activates the membership and returns tenant context', async () => {
		const invite = pendingInvite();
		membershipsRepository.findPendingInviteByTokenHash.mockResolvedValue(invite);
		membershipsRepository.acceptInviteAtomically.mockResolvedValue({
			invite: pendingInvite({ status: 'accepted' }),
			membership: membership(),
		});
		tenantsRepository.findById.mockResolvedValue({ id: 'tenant-1', name: 'Demo School' });

		const result = await service.acceptInvite(user, 'token');

		expect(membershipsRepository.acceptInviteAtomically).toHaveBeenCalledWith({
			inviteId: 'invite-1',
			userId: 'user-1',
		});
		expect(result.membership).toEqual({
			id: 'membership-1',
			tenantId: 'tenant-1',
			role: 'teacher',
			status: 'active',
		});
		expect(result.tenant).toEqual({ id: 'tenant-1', name: 'Demo School' });
	});

	it('reports an invite consumed concurrently as INVITE_NOT_FOUND', async () => {
		membershipsRepository.findPendingInviteByTokenHash.mockResolvedValue(pendingInvite());
		membershipsRepository.acceptInviteAtomically.mockResolvedValue(null);

		await expect(service.acceptInvite(user, 'token')).rejects.toBeInstanceOf(NotFoundException);
	});

	it('applies only invites it can claim', async () => {
		const claimed = pendingInvite({ id: 'invite-1' });
		const consumed = pendingInvite({ id: 'invite-2', tenantId: 'tenant-2' });
		membershipsRepository.listPendingInvitesForEmail.mockResolvedValue([claimed, consumed]);
		membershipsRepository.acceptInviteAtomically
			.mockResolvedValueOnce({
				invite: claimed,
				membership: membership(),
			})
			.mockResolvedValueOnce(null);
		tenantsRepository.findById.mockResolvedValue({ id: 'tenant-1', name: 'Demo School' });

		const result = await service.applyPendingInvitesForUser(user);

		expect(result).toEqual([
			{
				membershipId: 'membership-1',
				tenantId: 'tenant-1',
				tenantName: 'Demo School',
				role: 'teacher',
			},
		]);
	});

	it('previews a pending invite', async () => {
		membershipsRepository.findPendingInviteByTokenHash.mockResolvedValue(pendingInvite());
		tenantsRepository.findById.mockResolvedValue({ id: 'tenant-1', name: 'Demo School' });

		const result = await service.previewInvite('token');

		expect(result.invite.tenantName).toBe('Demo School');
	});
});
