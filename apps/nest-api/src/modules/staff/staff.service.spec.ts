import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MembershipsService } from '@/modules/memberships/memberships.service';
import { TimetableService } from '@/modules/timetable/timetable.service';
import { StaffRepository } from './staff.repository';
import { StaffService } from './staff.service';

const tenantId = 'tenant-1';
const teacherMembershipId = '8f1d2f3a-9b1c-4a2d-8e3f-0a1b2c3d4e5f';
const inTenantSectionId = '1a1a1111-1111-4111-8111-111111111111';
const inTenantSubjectId = '2b2b2222-2222-4222-8222-222222222222';
const foreignSectionId = '3c3c3333-3333-4333-8333-333333333333';
const foreignSubjectId = '4d4d4444-4444-4444-8444-444444444444';

const teacherMembership = { id: teacherMembershipId, role: 'teacher' };
const section = { id: inTenantSectionId, tenantId, name: '5-A' };
const subject = { id: inTenantSubjectId, tenantId, name: 'Mathematics' };
const assignment = {
	id: '5e5e5555-5555-4555-8555-555555555555',
	tenantId,
	sectionId: inTenantSectionId,
	subjectId: inTenantSubjectId,
	teacherMembershipId,
};

describe('StaffService.assignSectionSubject', () => {
	let staffRepository: {
		findMembership: ReturnType<typeof vi.fn>;
		findSectionById: ReturnType<typeof vi.fn>;
		findSubjectById: ReturnType<typeof vi.fn>;
		assignSectionSubject: ReturnType<typeof vi.fn>;
	};
	let membershipsService: {
		requirePermission: ReturnType<typeof vi.fn>;
	};
	let service: StaffService;

	beforeEach(() => {
		staffRepository = {
			findMembership: vi.fn().mockResolvedValue(teacherMembership),
			findSectionById: vi.fn().mockResolvedValue(section),
			findSubjectById: vi.fn().mockResolvedValue(subject),
			assignSectionSubject: vi.fn().mockResolvedValue(assignment),
		};
		membershipsService = {
			requirePermission: vi.fn().mockResolvedValue(undefined),
		};

		service = new StaffService(
			staffRepository as unknown as StaffRepository,
			membershipsService as unknown as MembershipsService,
			{} as TimetableService,
		);
	});

	it('assigns a section subject after resolving both parents in-tenant', async () => {
		const result = await service.assignSectionSubject(userId(), tenantId, {
			sectionId: inTenantSectionId,
			subjectId: inTenantSubjectId,
			teacherMembershipId,
		});

		expect(staffRepository.findSectionById).toHaveBeenCalledWith(tenantId, inTenantSectionId);
		expect(staffRepository.findSubjectById).toHaveBeenCalledWith(tenantId, inTenantSubjectId);
		expect(staffRepository.assignSectionSubject).toHaveBeenCalledWith({
			tenantId,
			sectionId: inTenantSectionId,
			subjectId: inTenantSubjectId,
			teacherMembershipId,
		});
		expect(result.assignment).toEqual(assignment);
	});

	it('rejects a section that does not belong to the tenant without writing', async () => {
		staffRepository.findSectionById.mockResolvedValue(null);

		await expect(
			service.assignSectionSubject(userId(), tenantId, {
				sectionId: foreignSectionId,
				subjectId: inTenantSubjectId,
				teacherMembershipId,
			}),
		).rejects.toMatchObject({ response: { code: 'SECTION_NOT_FOUND' } });

		expect(staffRepository.assignSectionSubject).not.toHaveBeenCalled();
	});

	it('rejects a subject that does not belong to the tenant without writing', async () => {
		staffRepository.findSubjectById.mockResolvedValue(null);

		await expect(
			service.assignSectionSubject(userId(), tenantId, {
				sectionId: inTenantSectionId,
				subjectId: foreignSubjectId,
				teacherMembershipId,
			}),
		).rejects.toMatchObject({ response: { code: 'SUBJECT_NOT_FOUND' } });

		expect(staffRepository.assignSectionSubject).not.toHaveBeenCalled();
	});

	it('rejects a membership that is not an active teacher', async () => {
		staffRepository.findMembership.mockResolvedValue({ id: teacherMembershipId, role: 'guardian' });

		await expect(
			service.assignSectionSubject(userId(), tenantId, {
				sectionId: inTenantSectionId,
				subjectId: inTenantSubjectId,
				teacherMembershipId,
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});

function userId() {
	return '9f9f9999-9999-4999-8999-999999999999';
}
