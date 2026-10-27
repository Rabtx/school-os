import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, type Mocked, vi } from 'vitest';

import type { AccessTokenPayload } from '@/modules/auth/auth.types';
import type { AuthenticatedRequest } from '@/modules/auth/jwt-auth.guard';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { TenantGuard } from './tenant.guard';
import { TenantsRepository } from './tenants.repository';

describe('TenantGuard', () => {
	let memberships: Mocked<MembershipsService>;
	let guard: TenantGuard;

	beforeEach(() => {
		memberships = {
			requireActiveMembership: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([]),
		} as unknown as Mocked<MembershipsService>;
		const tenantsRepository = {
			findById: vi.fn().mockResolvedValue({ id: 'tenant-a', status: 'active' }),
			isActive: vi.fn().mockReturnValue(true),
		} as unknown as TenantsRepository;
		guard = new TenantGuard(memberships, createMockPermissionsService(), tenantsRepository);
	});

	it('returns 404 when jwt tenant does not match route tenant', async () => {
		const request = {
			user: { sub: 'user-id', sid: 'session-id', tid: 'tenant-a', mid: 'membership-a' },
			params: { tenantId: 'tenant-b' },
		} as AuthenticatedRequest & { params: { tenantId: string } };

		memberships.requireActiveMembership.mockRejectedValue(
			new NotFoundException({ code: 'TENANT_NOT_FOUND', message: 'Tenant not found' }),
		);

		await expect(
			guard.canActivate({
				switchToHttp: () => ({ getRequest: () => request }),
			} as never),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it('attaches tenant context when membership is active', async () => {
		const user: AccessTokenPayload = {
			sub: 'user-id',
			sid: 'session-id',
			tid: 'tenant-a',
			mid: 'membership-a',
		};
		const request = {
			user,
			params: { tenantId: 'tenant-a' },
		} as AuthenticatedRequest & { params: { tenantId: string }; tenant?: unknown };

		memberships.requireActiveMembership.mockResolvedValue({
			id: 'membership-a',
			tenantId: 'tenant-a',
			userId: 'user-id',
			campusId: null,
			role: 'owner',
			status: 'active',
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await expect(
			guard.canActivate({
				switchToHttp: () => ({ getRequest: () => request }),
			} as never),
		).resolves.toBe(true);

		expect(request.tenant).toEqual({
			tenantId: 'tenant-a',
			membershipId: 'membership-a',
			userId: 'user-id',
			role: 'owner',
			roles: ['owner'],
			campusId: null,
			permissions: expect.arrayContaining(Object.values(PermissionCodes)),
		});
	});

	it('fails closed when the route has no tenant', async () => {
		const request = {
			user: { sub: 'user-id', sid: 'session-id' },
			params: {},
		} as unknown as AuthenticatedRequest;

		await expect(
			guard.canActivate({
				switchToHttp: () => ({ getRequest: () => request }),
			} as never),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(memberships.requireActiveMembership).not.toHaveBeenCalled();
	});
});
