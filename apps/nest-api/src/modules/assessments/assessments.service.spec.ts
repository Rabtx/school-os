import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { GuardiansRepository } from '@/modules/guardians/guardians.repository';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';
import { AssessmentsRepository } from './assessments.repository';
import { AssessmentsService } from './assessments.service';

type Role = 'owner' | 'teacher' | 'parent' | 'student';

describe('AssessmentsService.getStudentGrades', () => {
	let service: AssessmentsService;
	let membershipsRepository: {
		findActiveByTenantAndUser: ReturnType<typeof vi.fn>;
		listRolesForMembership: ReturnType<typeof vi.fn>;
	};
	let staffRepository: { teacherCanAccessStudent: ReturnType<typeof vi.fn> };
	let guardiansRepository: { listLinkedStudentsForMembership: ReturnType<typeof vi.fn> };
	let studentsRepository: { findStudentByMembershipId: ReturnType<typeof vi.fn> };
	let assessmentsRepository: { listResultsForStudent: ReturnType<typeof vi.fn> };

	const signInAs = (role: Role) =>
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role,
			status: 'active',
		});

	beforeEach(() => {
		membershipsRepository = {
			findActiveByTenantAndUser: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([]),
		};
		staffRepository = { teacherCanAccessStudent: vi.fn().mockResolvedValue(false) };
		guardiansRepository = { listLinkedStudentsForMembership: vi.fn().mockResolvedValue([]) };
		studentsRepository = { findStudentByMembershipId: vi.fn().mockResolvedValue(null) };
		assessmentsRepository = { listResultsForStudent: vi.fn().mockResolvedValue([]) };

		service = new AssessmentsService(
			assessmentsRepository as unknown as AssessmentsRepository,
			staffRepository as unknown as StaffRepository,
			studentsRepository as unknown as StudentsRepository,
			new MembershipsService(
				membershipsRepository as unknown as MembershipsRepository,
				createMockPermissionsService(),
			),
			guardiansRepository as unknown as GuardiansRepository,
		);
	});

	it('lets management read any student', async () => {
		signInAs('owner');

		await expect(service.getStudentGrades('user-1', 'tenant-1', 'student-9')).resolves.toEqual({
			grades: [],
		});
	});

	it('lets a teacher read a student in their classes only', async () => {
		signInAs('teacher');
		staffRepository.teacherCanAccessStudent.mockResolvedValueOnce(true);

		await expect(service.getStudentGrades('user-1', 'tenant-1', 'student-1')).resolves.toEqual({
			grades: [],
		});
		await expect(
			service.getStudentGrades('user-1', 'tenant-1', 'student-9'),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it('lets a parent read their linked children only', async () => {
		signInAs('parent');
		guardiansRepository.listLinkedStudentsForMembership.mockResolvedValue([
			{ student: { id: 'student-1' } },
		]);

		await expect(service.getStudentGrades('user-1', 'tenant-1', 'student-1')).resolves.toEqual({
			grades: [],
		});
		await expect(
			service.getStudentGrades('user-1', 'tenant-1', 'student-9'),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(assessmentsRepository.listResultsForStudent).toHaveBeenCalledTimes(1);
	});

	it('lets a student read only their own grades', async () => {
		signInAs('student');
		studentsRepository.findStudentByMembershipId.mockResolvedValue({ id: 'student-1' });

		await expect(service.getStudentGrades('user-1', 'tenant-1', 'student-1')).resolves.toEqual({
			grades: [],
		});
		await expect(
			service.getStudentGrades('user-1', 'tenant-1', 'student-9'),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
