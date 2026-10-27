import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { CampusesRepository } from './campuses.repository';
import { CampusesService } from './campuses.service';

const campusRecord = {
	id: 'campus-1',
	tenantId: 'tenant-1',
	name: 'AKES Karachi',
	code: 'KHI-01',
	address: 'Karachi',
	geoLat: null,
	geoLng: null,
	status: 'active' as const,
	deletedAt: null,
	createdAt: new Date('2026-07-23T00:00:00.000Z'),
	updatedAt: new Date('2026-07-23T00:00:00.000Z'),
};

describe('CampusesService', () => {
	let service: CampusesService;
	let campusesRepository: {
		findByCodeForTenant: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
		listByTenant: ReturnType<typeof vi.fn>;
		findByIdForTenant: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
	};
	let membershipsRepository: {
		findActiveByTenantAndUser: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		campusesRepository = {
			findByCodeForTenant: vi.fn(),
			create: vi.fn(),
			listByTenant: vi.fn(),
			findByIdForTenant: vi.fn(),
			update: vi.fn(),
		};
		membershipsRepository = {
			findActiveByTenantAndUser: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([]),
		};

		service = new CampusesService(
			campusesRepository as unknown as CampusesRepository,
			new MembershipsService(
				membershipsRepository as unknown as MembershipsRepository,
				createMockPermissionsService(),
			),
		);
	});

	it('creates a campus with normalized uppercase code for owners', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		campusesRepository.findByCodeForTenant.mockResolvedValue(null);
		campusesRepository.create.mockResolvedValue(campusRecord);

		const result = await service.create('user-1', 'tenant-1', {
			name: 'AKES Karachi',
			code: 'khi-01',
		});

		expect(campusesRepository.create).toHaveBeenCalledWith(
			expect.objectContaining({ code: 'KHI-01', tenantId: 'tenant-1' }),
		);
		expect(result.campus.code).toBe('KHI-01');
	});

	it('rejects duplicate campus codes within a tenant', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		campusesRepository.findByCodeForTenant.mockResolvedValue(campusRecord);

		await expect(
			service.create('user-1', 'tenant-1', { name: 'Duplicate', code: 'KHI-01' }),
		).rejects.toBeInstanceOf(ConflictException);
	});

	it('lists campuses for any active member', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});
		campusesRepository.listByTenant.mockResolvedValue([campusRecord]);

		const result = await service.list('user-1', 'tenant-1');

		expect(result.campuses).toHaveLength(1);
	});

	it('returns 404 when campus does not belong to tenant', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		campusesRepository.findByIdForTenant.mockResolvedValue(null);

		await expect(service.get('user-1', 'tenant-1', 'campus-missing')).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it('blocks campus creation for non-manager roles', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'parent',
			status: 'active',
		});

		await expect(
			service.create('user-1', 'tenant-1', { name: 'Blocked', code: 'BLK-01' }),
		).rejects.toBeInstanceOf(ForbiddenException);
	});
});
