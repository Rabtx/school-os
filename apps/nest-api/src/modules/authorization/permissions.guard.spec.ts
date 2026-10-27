import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TenantScopedRequest } from '@/modules/tenants/tenant.guard';

import { PermissionCodes } from './permission-codes';
import { PermissionsGuard } from './permissions.guard';
import { createMockPermissionsService } from './testing/mock-permissions.service';

function createContext(request: Partial<TenantScopedRequest>): ExecutionContext {
	return {
		switchToHttp: () => ({
			getRequest: () => request,
		}),
		getHandler: () => vi.fn(),
		getClass: () => vi.fn(),
	} as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
	let guard: PermissionsGuard;
	let reflector: Reflector;

	beforeEach(() => {
		reflector = new Reflector();
		guard = new PermissionsGuard(reflector, createMockPermissionsService());
	});

	it('allows routes without required permissions metadata', () => {
		vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

		expect(
			guard.canActivate(
				createContext({
					user: { sub: 'user-1', sid: 'session-1' },
					tenant: {
						tenantId: 'tenant-1',
						membershipId: 'membership-1',
						userId: 'user-1',
						role: 'teacher',
						roles: ['teacher'],
						campusId: null,
						permissions: [],
					},
				}),
			),
		).toBe(true);
	});

	it('requires authentication', () => {
		vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
			PermissionCodes.TENANT_CAMPUS_CREATE,
		]);

		expect(() => guard.canActivate(createContext({}))).toThrow(UnauthorizedException);
	});

	it('requires tenant context when permissions are required', () => {
		vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
			PermissionCodes.TENANT_CAMPUS_CREATE,
		]);

		expect(() =>
			guard.canActivate(
				createContext({
					user: { sub: 'user-1', sid: 'session-1' },
				}),
			),
		).toThrow(ForbiddenException);
	});

	it('allows owner to create campuses', () => {
		vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
			PermissionCodes.TENANT_CAMPUS_CREATE,
		]);

		expect(
			guard.canActivate(
				createContext({
					user: { sub: 'user-1', sid: 'session-1' },
					tenant: {
						tenantId: 'tenant-1',
						membershipId: 'membership-1',
						userId: 'user-1',
						role: 'owner',
						roles: ['owner'],
						campusId: null,
						permissions: [PermissionCodes.TENANT_CAMPUS_CREATE],
					},
				}),
			),
		).toBe(true);
	});

	it('denies teacher from creating campuses', () => {
		vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
			PermissionCodes.TENANT_CAMPUS_CREATE,
		]);

		expect(() =>
			guard.canActivate(
				createContext({
					user: { sub: 'user-1', sid: 'session-1' },
					tenant: {
						tenantId: 'tenant-1',
						membershipId: 'membership-1',
						userId: 'user-1',
						role: 'teacher',
						roles: ['teacher'],
						campusId: null,
						permissions: [],
					},
				}),
			),
		).toThrow(ForbiddenException);
	});
});
