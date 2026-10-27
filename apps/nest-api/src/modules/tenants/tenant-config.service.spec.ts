import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { TenantConfigRepository } from './tenant-config.repository';
import { TenantConfigService } from './tenant-config.service';
import { TenantsRepository } from './tenants.repository';

describe('TenantConfigService', () => {
	let service: TenantConfigService;
	let tenantConfigRepository: {
		ensureDefaults: ReturnType<typeof vi.fn>;
		findByTenantId: ReturnType<typeof vi.fn>;
		updateSettings: ReturnType<typeof vi.fn>;
		updateBranding: ReturnType<typeof vi.fn>;
		updateCommunicationPolicy: ReturnType<typeof vi.fn>;
	};
	let tenantsRepository: {
		findById: ReturnType<typeof vi.fn>;
	};
	let membershipsRepository: {
		findActiveByTenantAndUser: ReturnType<typeof vi.fn>;
		listRolesForMembership: ReturnType<typeof vi.fn>;
	};

	const tenant = {
		id: 'tenant-1',
		name: 'AKES Network',
		slug: 'akes-network',
		mission: null,
		status: 'active' as const,
		timezone: 'Asia/Karachi',
		defaultLocale: 'en',
		deletedAt: null,
		createdAt: new Date('2026-07-23T00:00:00.000Z'),
		updatedAt: new Date('2026-07-23T00:00:00.000Z'),
	};

	const configRows = {
		settings: {
			id: 'settings-1',
			tenantId: 'tenant-1',
			academicYearStartMonth: 4,
			attendanceGraceMinutes: 15,
			quietHoursStart: '22:00:00',
			quietHoursEnd: '07:00:00',
			createdAt: tenant.createdAt,
			updatedAt: tenant.updatedAt,
		},
		branding: {
			id: 'branding-1',
			tenantId: 'tenant-1',
			displayNameEn: 'AKES Network',
			displayNameUr: null,
			logoUrl: null,
			primaryColor: null,
			accentColor: null,
			createdAt: tenant.createdAt,
			updatedAt: tenant.updatedAt,
		},
		communicationPolicy: {
			id: 'policy-1',
			tenantId: 'tenant-1',
			whatsappEnabled: true,
			smsFallbackEnabled: true,
			emailFallbackEnabled: true,
			notifyAllGuardians: false,
			sickReportRequiresNote: false,
			createdAt: tenant.createdAt,
			updatedAt: tenant.updatedAt,
		},
	};

	beforeEach(() => {
		tenantConfigRepository = {
			ensureDefaults: vi.fn(),
			findByTenantId: vi.fn(),
			updateSettings: vi.fn(),
			updateBranding: vi.fn(),
			updateCommunicationPolicy: vi.fn(),
		};
		tenantsRepository = {
			findById: vi.fn(),
		};
		membershipsRepository = {
			findActiveByTenantAndUser: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([]),
		};

		service = new TenantConfigService(
			tenantConfigRepository as unknown as TenantConfigRepository,
			tenantsRepository as unknown as TenantsRepository,
			new MembershipsService(
				membershipsRepository as unknown as MembershipsRepository,
				createMockPermissionsService(),
			),
		);
	});

	it('returns organization config for active members', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		tenantsRepository.findById.mockResolvedValue(tenant);
		tenantConfigRepository.findByTenantId.mockResolvedValue(configRows);

		const result = await service.getForUser('user-1', 'tenant-1');

		expect(tenantConfigRepository.ensureDefaults).toHaveBeenCalledWith('tenant-1', 'AKES Network');
		expect(result.config.settings.quietHoursStart).toBe('22:00');
		expect(result.config.branding.displayNameEn).toBe('AKES Network');
	});

	it('updates settings for management roles', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		tenantsRepository.findById.mockResolvedValue(tenant);
		tenantConfigRepository.findByTenantId.mockResolvedValue({
			...configRows,
			settings: { ...configRows.settings, attendanceGraceMinutes: 30 },
		});
		tenantConfigRepository.updateSettings.mockResolvedValue({
			...configRows.settings,
			attendanceGraceMinutes: 30,
		});

		const result = await service.updateForUser('user-1', 'tenant-1', {
			settings: { attendanceGraceMinutes: 30 },
		});

		expect(tenantConfigRepository.updateSettings).toHaveBeenCalledWith('tenant-1', {
			academicYearStartMonth: undefined,
			attendanceGraceMinutes: 30,
			quietHoursStart: undefined,
			quietHoursEnd: undefined,
		});
		expect(result.config.settings.attendanceGraceMinutes).toBe(30);
	});

	it('returns 404 for cross-tenant reads', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue(null);

		await expect(service.getForUser('user-1', 'tenant-other')).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});

	it('requires management role to update config', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});

		await expect(
			service.updateForUser('user-1', 'tenant-1', {
				settings: { attendanceGraceMinutes: 30 },
			}),
		).rejects.toBeInstanceOf(ForbiddenException);
	});
});
