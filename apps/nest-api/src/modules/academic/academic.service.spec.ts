import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { CampusesRepository } from '@/modules/campuses/campuses.repository';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { AcademicRepository } from './academic.repository';
import { AcademicService } from './academic.service';

const academicYearRecord = {
	id: 'year-1',
	tenantId: 'tenant-1',
	name: '2026–27',
	startsOn: '2026-04-01',
	endsOn: '2027-03-31',
	status: 'draft' as const,
	deletedAt: null,
	createdAt: new Date('2026-07-23T00:00:00.000Z'),
	updatedAt: new Date('2026-07-23T00:00:00.000Z'),
};

describe('AcademicService', () => {
	let service: AcademicService;
	let academicRepository: {
		listAcademicYears: ReturnType<typeof vi.fn>;
		findActiveAcademicYear: ReturnType<typeof vi.fn>;
		createAcademicYear: ReturnType<typeof vi.fn>;
		findAcademicYearById: ReturnType<typeof vi.fn>;
		listClasses: ReturnType<typeof vi.fn>;
		findClassByName: ReturnType<typeof vi.fn>;
		createClass: ReturnType<typeof vi.fn>;
		findClassById: ReturnType<typeof vi.fn>;
		listSections: ReturnType<typeof vi.fn>;
		findSectionById: ReturnType<typeof vi.fn>;
		createSection: ReturnType<typeof vi.fn>;
		updateSection: ReturnType<typeof vi.fn>;
	};
	let campusesRepository: {
		findByIdForTenant: ReturnType<typeof vi.fn>;
	};
	let membershipsRepository: {
		findActiveByTenantAndUser: ReturnType<typeof vi.fn>;
		findActiveById: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		academicRepository = {
			listAcademicYears: vi.fn(),
			findActiveAcademicYear: vi.fn(),
			createAcademicYear: vi.fn(),
			findAcademicYearById: vi.fn(),
			listClasses: vi.fn(),
			findClassByName: vi.fn(),
			createClass: vi.fn(),
			findClassById: vi.fn(),
			listSections: vi.fn(),
			findSectionById: vi.fn(),
			createSection: vi.fn(),
			updateSection: vi.fn(),
		};
		campusesRepository = {
			findByIdForTenant: vi.fn(),
		};
		membershipsRepository = {
			findActiveByTenantAndUser: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([]),
			findActiveById: vi.fn(),
		};

		service = new AcademicService(
			academicRepository as unknown as AcademicRepository,
			campusesRepository as unknown as CampusesRepository,
			membershipsRepository as unknown as MembershipsRepository,
			new MembershipsService(
				membershipsRepository as unknown as MembershipsRepository,
				createMockPermissionsService(),
			),
		);
	});

	it('lists academic years for active members with read permission', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});
		academicRepository.listAcademicYears.mockResolvedValue([academicYearRecord]);

		const result = await service.listAcademicYears('user-1', 'tenant-1');

		expect(result.academicYears).toHaveLength(1);
		expect(result.academicYears[0]?.name).toBe('2026–27');
	});

	it('creates an academic year for managers', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		academicRepository.findActiveAcademicYear.mockResolvedValue(null);
		academicRepository.createAcademicYear.mockResolvedValue(academicYearRecord);

		const result = await service.createAcademicYear('user-1', 'tenant-1', {
			name: '2026–27',
			startsOn: '2026-04-01',
			endsOn: '2027-03-31',
		});

		expect(result.academicYear.name).toBe('2026–27');
	});

	it('rejects a second active academic year', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		academicRepository.findActiveAcademicYear.mockResolvedValue({
			...academicYearRecord,
			status: 'active',
		});

		await expect(
			service.createAcademicYear('user-1', 'tenant-1', {
				name: '2027–28',
				startsOn: '2027-04-01',
				endsOn: '2028-03-31',
				status: 'active',
			}),
		).rejects.toBeInstanceOf(ConflictException);
	});

	it('blocks academic writes for parents', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'parent',
			status: 'active',
		});

		await expect(
			service.createClass('user-1', 'tenant-1', { name: 'Grade 7' }),
		).rejects.toBeInstanceOf(ForbiddenException);
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

		await expect(
			service.createSection('user-1', 'tenant-1', {
				campusId: 'campus-missing',
				classId: 'class-1',
				academicYearId: 'year-1',
				name: '7-B',
			}),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
