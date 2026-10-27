import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MembershipRecord } from '@/database/schema';
import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { GuardiansRepository } from '@/modules/guardians/guardians.repository';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';
import { AccessScopeService } from './access-scope.service';

type Role = MembershipRecord['role'];

const membershipAs = (role: Role) =>
	({
		id: 'membership-1',
		tenantId: 'tenant-1',
		userId: 'user-1',
		role,
		status: 'active',
	}) as MembershipRecord;

describe('AccessScopeService', () => {
	let service: AccessScopeService;
	let membershipsRepository: { listRolesForMembership: ReturnType<typeof vi.fn> };
	let staffRepository: { teacherCanAccessStudent: ReturnType<typeof vi.fn> };
	let guardiansRepository: { listLinkedStudentsForMembership: ReturnType<typeof vi.fn> };
	let studentsRepository: { findStudentByMembershipId: ReturnType<typeof vi.fn> };

	beforeEach(() => {
		membershipsRepository = { listRolesForMembership: vi.fn().mockResolvedValue([]) };
		staffRepository = { teacherCanAccessStudent: vi.fn().mockResolvedValue(false) };
		guardiansRepository = { listLinkedStudentsForMembership: vi.fn().mockResolvedValue([]) };
		studentsRepository = { findStudentByMembershipId: vi.fn().mockResolvedValue(null) };

		service = new AccessScopeService(
			new MembershipsService(
				membershipsRepository as unknown as MembershipsRepository,
				createMockPermissionsService(),
			),
			staffRepository as unknown as StaffRepository,
			guardiansRepository as unknown as GuardiansRepository,
			studentsRepository as unknown as StudentsRepository,
		);
	});

	it('lets management see any student', async () => {
		const results = await Promise.all(
			(['owner', 'principal', 'admin'] as const).map((role) =>
				service.canAccessStudent('tenant-1', membershipAs(role), 'student-9'),
			),
		);
		expect(results).toEqual([true, true, true]);
	});

	it('lets a teacher see students in their assigned sections only', async () => {
		staffRepository.teacherCanAccessStudent.mockImplementation(
			async (_tenantId: string, _membershipId: string, studentId: string) =>
				studentId === 'student-1',
		);

		await expect(
			service.canAccessStudent('tenant-1', membershipAs('teacher'), 'student-1'),
		).resolves.toBe(true);
		await expect(
			service.requireStudentAccess('tenant-1', membershipAs('teacher'), 'student-9'),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it('lets a parent see their linked children only', async () => {
		guardiansRepository.listLinkedStudentsForMembership.mockResolvedValue([
			{ student: { id: 'student-1' } },
		]);

		await expect(
			service.canAccessStudent('tenant-1', membershipAs('parent'), 'student-1'),
		).resolves.toBe(true);
		await expect(
			service.canAccessStudent('tenant-1', membershipAs('parent'), 'student-9'),
		).resolves.toBe(false);
	});

	it('lets a student see only themselves', async () => {
		studentsRepository.findStudentByMembershipId.mockResolvedValue({ id: 'student-1' });

		await expect(
			service.canAccessStudent('tenant-1', membershipAs('student'), 'student-1'),
		).resolves.toBe(true);
		await expect(
			service.canAccessStudent('tenant-1', membershipAs('student'), 'student-9'),
		).resolves.toBe(false);
	});

	it('uses every role a membership holds', async () => {
		membershipsRepository.listRolesForMembership.mockResolvedValue([
			{ role: 'teacher' },
			{ role: 'parent' },
		]);
		guardiansRepository.listLinkedStudentsForMembership.mockResolvedValue([
			{ student: { id: 'own-child' } },
		]);

		await expect(
			service.canAccessStudent('tenant-1', membershipAs('teacher'), 'own-child'),
		).resolves.toBe(true);
	});
});
