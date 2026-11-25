import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { TenantsRepository } from './tenants.repository';
import { TenantsService } from './tenants.service';

describe('TenantsService', () => {
	let service: TenantsService;
	let tenantsRepository: {
		createWithOwnerMembership: ReturnType<typeof vi.fn>;
		slugExists: ReturnType<typeof vi.fn>;
		listByIds: ReturnType<typeof vi.fn>;
		findById: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
	};
	let membershipsRepository: {
		countActiveOwnedTenantsForUser: ReturnType<typeof vi.fn>;
		listActiveTenantIdsForUser: ReturnType<typeof vi.fn>;
		findActiveByTenantAndUser: ReturnType<typeof vi.fn>;
		listRolesForMembership: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		tenantsRepository = {
			createWithOwnerMembership: vi.fn(),
			slugExists: vi.fn(),
			listByIds: vi.fn(),
			findById: vi.fn(),
			update: vi.fn(),
		};
		membershipsRepository = {
			countActiveOwnedTenantsForUser: vi.fn().mockResolvedValue(0),
			listActiveTenantIdsForUser: vi.fn(),
			findActiveByTenantAndUser: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([]),
		};

		service = new TenantsService(
			tenantsRepository as unknown as TenantsRepository,
			membershipsRepository as unknown as MembershipsRepository,
			new MembershipsService(
				membershipsRepository as unknown as MembershipsRepository,
				createMockPermissionsService(),
			),
		);
	});

	it('creates a tenant with a generated slug and owner membership', async () => {
		const now = new Date('2026-07-23T00:00:00.000Z');
		tenantsRepository.slugExists.mockResolvedValue(false);
		tenantsRepository.createWithOwnerMembership.mockResolvedValue({
			id: 'tenant-1',
			name: 'AKES Network',
			slug: 'akes-network',
			mission: null,
			status: 'active',
			timezone: 'Asia/Karachi',
			defaultLocale: 'en',
			deletedAt: null,
			createdAt: now,
			updatedAt: now,
		});

		const result = await service.create('user-1', { name: 'AKES Network' });

		expect(tenantsRepository.createWithOwnerMembership).toHaveBeenCalledWith({
			tenant: {
				name: 'AKES Network',
				slug: 'akes-network',
				mission: null,
				timezone: 'Asia/Karachi',
				defaultLocale: 'en',
			},
			userId: 'user-1',
		});
		expect(result.tenant.slug).toBe('akes-network');
	});

	it('deduplicates slug collisions', async () => {
		tenantsRepository.slugExists
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(false)
			.mockResolvedValue(false);
		tenantsRepository.createWithOwnerMembership.mockResolvedValue({
			id: 'tenant-2',
			name: 'Demo School',
			slug: 'demo-school-2',
			mission: null,
			status: 'active',
			timezone: 'Asia/Karachi',
			defaultLocale: 'en',
			deletedAt: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		await service.create('user-1', { name: 'Demo School' });

		expect(tenantsRepository.createWithOwnerMembership).toHaveBeenCalledWith(
			expect.objectContaining({
				tenant: expect.objectContaining({ slug: 'demo-school-2' }),
			}),
		);
	});

	it('rejects invalid slug derivation', async () => {
		await expect(service.create('user-1', { name: '!!!' })).rejects.toBeInstanceOf(
			ConflictException,
		);
	});

	it('rejects tenant creation at the owned-tenant cap', async () => {
		membershipsRepository.countActiveOwnedTenantsForUser.mockResolvedValue(5);
		tenantsRepository.slugExists.mockResolvedValue(false);

		await expect(service.create('user-1', { name: 'One More School' })).rejects.toBeInstanceOf(
			ForbiddenException,
		);
		expect(tenantsRepository.createWithOwnerMembership).not.toHaveBeenCalled();
	});

	it('retries with the next slug suffix when a concurrent create wins the slug', async () => {
		tenantsRepository.slugExists.mockResolvedValue(false);
		const uniqueViolation = Object.assign(new Error('duplicate key'), { code: '23505' });
		tenantsRepository.createWithOwnerMembership
			.mockRejectedValueOnce(uniqueViolation)
			.mockResolvedValueOnce({
				id: 'tenant-3',
				name: 'Demo School',
				slug: 'demo-school-2',
				mission: null,
				status: 'active',
				timezone: 'Asia/Karachi',
				defaultLocale: 'en',
				deletedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

		const result = await service.create('user-1', { name: 'Demo School' });

		expect(result.tenant.slug).toBe('demo-school-2');
		expect(tenantsRepository.createWithOwnerMembership).toHaveBeenCalledTimes(2);
	});

	it('rethrows errors that are not slug unique violations', async () => {
		tenantsRepository.slugExists.mockResolvedValue(false);
		tenantsRepository.createWithOwnerMembership.mockRejectedValue(new Error('connection lost'));

		await expect(service.create('user-1', { name: 'Demo School' })).rejects.toThrow(
			'connection lost',
		);
	});

	it('lists only tenants the user belongs to', async () => {
		const now = new Date('2026-07-23T00:00:00.000Z');
		membershipsRepository.listActiveTenantIdsForUser.mockResolvedValue(['tenant-1']);
		tenantsRepository.listByIds.mockResolvedValue([
			{
				id: 'tenant-1',
				name: 'AKES Network',
				slug: 'akes-network',
				mission: null,
				status: 'active',
				timezone: 'Asia/Karachi',
				defaultLocale: 'en',
				deletedAt: null,
				createdAt: now,
				updatedAt: now,
			},
		]);

		const result = await service.listForUser('user-1');

		expect(membershipsRepository.listActiveTenantIdsForUser).toHaveBeenCalledWith('user-1');
		expect(result.tenants).toHaveLength(1);
	});

	it('returns 404 for cross-tenant reads', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue(null);

		await expect(service.getForUser('user-1', 'tenant-other')).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it('requires management role to update tenant', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});

		await expect(service.update('user-1', 'tenant-1', { name: 'New Name' })).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});
});
