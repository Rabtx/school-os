import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';

import { MembershipsRepository } from './memberships.repository';
import { MembershipsService } from './memberships.service';

describe('MembershipsService', () => {
	let service: MembershipsService;
	let repository: {
		findActiveByTenantAndUser: ReturnType<typeof vi.fn>;
		listRolesForMembership: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		repository = {
			findActiveByTenantAndUser: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([]),
		};
		service = new MembershipsService(
			repository as unknown as MembershipsRepository,
			createMockPermissionsService(),
		);
	});

	it('returns membership when user belongs to tenant', async () => {
		const membership = {
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher' as const,
			status: 'active' as const,
		};
		repository.findActiveByTenantAndUser.mockResolvedValue(membership);

		await expect(service.requireActiveMembership('user-1', 'tenant-1')).resolves.toEqual(
			membership,
		);
	});

	it('returns 404 when user is not a member (cross-tenant isolation)', async () => {
		repository.findActiveByTenantAndUser.mockResolvedValue(null);

		await expect(service.requireActiveMembership('user-1', 'tenant-2')).rejects.toMatchObject({
			response: { code: 'TENANT_NOT_FOUND' },
		});
		await expect(service.requireActiveMembership('user-1', 'tenant-2')).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it('allows owner, principal, and admin to manage tenant', async () => {
		for (const role of ['owner', 'principal', 'admin'] as const) {
			repository.findActiveByTenantAndUser.mockResolvedValue({
				id: 'membership-1',
				tenantId: 'tenant-1',
				userId: 'user-1',
				role,
				status: 'active',
			});

			await expect(service.requireManagementAccess('user-1', 'tenant-1')).resolves.toMatchObject({
				role,
			});
		}
	});

	it('denies teacher from managing tenant', async () => {
		repository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});

		await expect(service.requireManagementAccess('user-1', 'tenant-1')).rejects.toMatchObject({
			response: { code: 'PERMISSION_DENIED' },
		});
		await expect(service.requireManagementAccess('user-1', 'tenant-1')).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});
});
