import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AcademicRepository } from '@/modules/academic/academic.repository';
import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { CampusesRepository } from '@/modules/campuses/campuses.repository';
import { GuardiansRepository } from '@/modules/guardians/guardians.repository';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentPhotoStorageService } from './student-photo-storage.service';
import { StudentsRepository } from './students.repository';
import { StudentsService } from './students.service';

const studentRecord = {
	id: 'student-1',
	tenantId: 'tenant-1',
	campusId: 'campus-1',
	studentCode: 'AKES-2026-001',
	firstName: 'Amara',
	lastName: 'Okafor',
	dateOfBirth: '2012-05-14',
	gender: 'female' as const,
	status: 'active' as const,
	deletedAt: null,
	createdAt: new Date('2026-07-23T00:00:00.000Z'),
	updatedAt: new Date('2026-07-23T00:00:00.000Z'),
};

const sectionRecord = {
	id: 'section-1',
	tenantId: 'tenant-1',
	campusId: 'campus-1',
	classId: 'class-1',
	academicYearId: 'year-1',
	name: '7-B',
	homeroomTeacherMembershipId: null,
	status: 'active' as const,
	deletedAt: null,
	createdAt: new Date('2026-07-23T00:00:00.000Z'),
	updatedAt: new Date('2026-07-23T00:00:00.000Z'),
};

describe('StudentsService', () => {
	let service: StudentsService;
	let studentsRepository: {
		listStudents: ReturnType<typeof vi.fn>;
		listStudentsInSections: ReturnType<typeof vi.fn>;
		findStudentById: ReturnType<typeof vi.fn>;
		findStudentByCode: ReturnType<typeof vi.fn>;
		createStudentInTransaction: ReturnType<typeof vi.fn>;
		updateStudent: ReturnType<typeof vi.fn>;
		listEnrollments: ReturnType<typeof vi.fn>;
		findActiveEnrollmentForYear: ReturnType<typeof vi.fn>;
		createEnrollmentAtomic: ReturnType<typeof vi.fn>;
	};
	let campusesRepository: {
		findByIdForTenant: ReturnType<typeof vi.fn>;
	};
	let academicRepository: {
		findSectionById: ReturnType<typeof vi.fn>;
		findAcademicYearById: ReturnType<typeof vi.fn>;
	};
	let membershipsRepository: {
		findActiveByTenantAndUser: ReturnType<typeof vi.fn>;
		listRolesForMembership: ReturnType<typeof vi.fn>;
	};
	let guardiansRepository: {
		listStudentGuardians: ReturnType<typeof vi.fn>;
	};
	let staffRepository: {
		listTeacherAssignedSectionIds: ReturnType<typeof vi.fn>;
		teacherCanAccessStudent: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		studentsRepository = {
			listStudents: vi.fn(),
			listStudentsInSections: vi.fn(),
			findStudentById: vi.fn(),
			findStudentByCode: vi.fn(),
			createStudentInTransaction: vi.fn(),
			updateStudent: vi.fn(),
			listEnrollments: vi.fn(),
			findActiveEnrollmentForYear: vi.fn(),
			createEnrollmentAtomic: vi.fn(),
		};
		campusesRepository = {
			findByIdForTenant: vi.fn(),
		};
		academicRepository = {
			findSectionById: vi.fn(),
			findAcademicYearById: vi.fn(),
		};
		membershipsRepository = {
			findActiveByTenantAndUser: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([]),
		};
		guardiansRepository = {
			listStudentGuardians: vi.fn().mockResolvedValue([]),
		};
		staffRepository = {
			listTeacherAssignedSectionIds: vi.fn().mockResolvedValue([]),
			teacherCanAccessStudent: vi.fn().mockResolvedValue(true),
		};

		service = new StudentsService(
			studentsRepository as unknown as StudentsRepository,
			campusesRepository as unknown as CampusesRepository,
			academicRepository as unknown as AcademicRepository,
			guardiansRepository as unknown as GuardiansRepository,
			new MembershipsService(
				membershipsRepository as unknown as MembershipsRepository,
				createMockPermissionsService(),
			),
			staffRepository as unknown as StaffRepository,
			{} as StudentPhotoStorageService,
		);
	});

	it('lists only assigned-section students for teachers', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});
		campusesRepository.findByIdForTenant.mockResolvedValue({ id: 'campus-1' });
		staffRepository.listTeacherAssignedSectionIds.mockResolvedValue(['section-1']);
		studentsRepository.listStudentsInSections.mockResolvedValue([studentRecord]);

		const result = await service.listStudents('user-1', 'tenant-1', { campusId: 'campus-1' });

		expect(studentsRepository.listStudentsInSections).toHaveBeenCalledWith(
			'tenant-1',
			['section-1'],
			{ campusId: 'campus-1' },
		);
		expect(studentsRepository.listStudents).not.toHaveBeenCalled();
		expect(result.students).toHaveLength(1);
		expect(result.students[0]?.studentCode).toBe('AKES-2026-001');
	});

	it('rejects student creation without write permission', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});

		await expect(
			service.createStudent('user-1', 'tenant-1', {
				campusId: 'campus-1',
				studentCode: 'AKES-2026-002',
				firstName: 'Liam',
				lastName: 'Bennett',
			}),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('creates a student for managers', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'admin',
			status: 'active',
		});
		campusesRepository.findByIdForTenant.mockResolvedValue({ id: 'campus-1' });
		studentsRepository.findStudentByCode.mockResolvedValue(null);
		studentsRepository.createStudentInTransaction.mockResolvedValue(studentRecord);

		const result = await service.createStudent('user-1', 'tenant-1', {
			campusId: 'campus-1',
			studentCode: 'akes-2026-001',
			firstName: 'Amara',
			lastName: 'Okafor',
		});

		expect(result.student.studentCode).toBe('AKES-2026-001');
	});

	it('enrolls a student into a section for the same campus and year', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		studentsRepository.findStudentById.mockResolvedValue(studentRecord);
		academicRepository.findSectionById.mockResolvedValue(sectionRecord);
		academicRepository.findAcademicYearById.mockResolvedValue({ id: 'year-1' });
		studentsRepository.findActiveEnrollmentForYear.mockResolvedValue(null);
		studentsRepository.createEnrollmentAtomic.mockResolvedValue({
			id: 'enrollment-1',
			tenantId: 'tenant-1',
			studentId: 'student-1',
			sectionId: 'section-1',
			academicYearId: 'year-1',
			status: 'active',
			enrolledOn: '2026-07-23',
			deletedAt: null,
			createdAt: new Date('2026-07-23T00:00:00.000Z'),
			updatedAt: new Date('2026-07-23T00:00:00.000Z'),
		});

		const result = await service.createEnrollment('user-1', 'tenant-1', 'student-1', {
			sectionId: 'section-1',
			academicYearId: 'year-1',
		});

		expect(result.enrollment.sectionId).toBe('section-1');
	});

	it('rejects duplicate active enrollment for the same year', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		studentsRepository.findStudentById.mockResolvedValue(studentRecord);
		academicRepository.findSectionById.mockResolvedValue(sectionRecord);
		academicRepository.findAcademicYearById.mockResolvedValue({ id: 'year-1' });
		studentsRepository.createEnrollmentAtomic.mockRejectedValue(
			new ConflictException({ code: 'ENROLLMENT_EXISTS', message: 'Already enrolled' }),
		);

		await expect(
			service.createEnrollment('user-1', 'tenant-1', 'student-1', {
				sectionId: 'section-1',
				academicYearId: 'year-1',
			}),
		).rejects.toBeInstanceOf(ConflictException);
	});

	it('returns not found for cross-tenant student access', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		studentsRepository.findStudentById.mockResolvedValue(null);

		await expect(service.getStudent('user-1', 'tenant-1', 'student-1')).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});
});
