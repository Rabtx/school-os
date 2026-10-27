import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { GuardiansRepository } from '@/modules/guardians/guardians.repository';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';
import { HomeworkRepository } from './homework.repository';
import { HomeworkService } from './homework.service';

const sectionSubjectRow = {
	assignment: {
		id: 'section-subject-1',
		tenantId: 'tenant-1',
		sectionId: 'section-1',
		subjectId: 'subject-1',
		teacherMembershipId: 'teacher-membership-1',
		createdAt: new Date(),
		updatedAt: new Date(),
	},
	section: {
		id: 'section-1',
		name: '7-B',
	},
	subject: {
		id: 'subject-1',
		code: 'MATH',
		name: 'Mathematics',
	},
};

const homeworkRecord = {
	id: 'homework-1',
	tenantId: 'tenant-1',
	sectionSubjectId: 'section-subject-1',
	title: 'Chapter 3 exercises',
	description: 'Complete questions 1-10',
	dueAt: new Date('2026-07-30T12:00:00.000Z'),
	status: 'published' as const,
	assignMode: 'whole_class' as const,
	estimatedMinutes: 30,
	materials: null,
	createdByMembershipId: 'teacher-membership-1',
	createdAt: new Date('2026-07-24T00:00:00.000Z'),
	updatedAt: new Date('2026-07-24T00:00:00.000Z'),
};

describe('HomeworkService', () => {
	let service: HomeworkService;
	let homeworkRepository: {
		list: ReturnType<typeof vi.fn>;
		listForSectionSubjects: ReturnType<typeof vi.fn>;
		findById: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
		listRecipientStudentIds: ReturnType<typeof vi.fn>;
		countRecipients: ReturnType<typeof vi.fn>;
		syncRecipients: ReturnType<typeof vi.fn>;
	};
	let staffRepository: {
		listSubjectAssignments: ReturnType<typeof vi.fn>;
		findSectionSubjectById: ReturnType<typeof vi.fn>;
		teacherCanAccessSectionSubject: ReturnType<typeof vi.fn>;
	};
	let studentsRepository: {
		listStudentsInSections: ReturnType<typeof vi.fn>;
		listEnrollments: ReturnType<typeof vi.fn>;
	};
	let membershipsRepository: {
		findActiveByTenantAndUser: ReturnType<typeof vi.fn>;
		listRolesForMembership: ReturnType<typeof vi.fn>;
	};

	let guardiansRepository: {
		listLinkedStudentsForMembership: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		homeworkRepository = {
			list: vi.fn().mockResolvedValue([]),
			listForSectionSubjects: vi.fn(),
			findById: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			listRecipientStudentIds: vi.fn().mockResolvedValue([]),
			countRecipients: vi.fn().mockResolvedValue(0),
			syncRecipients: vi.fn(),
		};
		staffRepository = {
			listSubjectAssignments: vi.fn(),
			findSectionSubjectById: vi.fn(),
			teacherCanAccessSectionSubject: vi.fn(),
		};
		studentsRepository = {
			listStudentsInSections: vi.fn().mockResolvedValue([
				{
					id: 'student-1',
					firstName: 'Amina',
					lastName: 'Khan',
					studentCode: 'S001',
				},
			]),
			listEnrollments: vi.fn().mockResolvedValue([]),
		};
		membershipsRepository = {
			findActiveByTenantAndUser: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([{ role: 'teacher' }]),
		};
		guardiansRepository = {
			listLinkedStudentsForMembership: vi.fn().mockResolvedValue([]),
		};

		service = new HomeworkService(
			homeworkRepository as unknown as HomeworkRepository,
			staffRepository as unknown as StaffRepository,
			studentsRepository as unknown as StudentsRepository,
			new MembershipsService(
				membershipsRepository as unknown as MembershipsRepository,
				createMockPermissionsService(),
			),
			guardiansRepository as unknown as GuardiansRepository,
		);
	});

	it('lists homework for teacher subject assignments only', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'teacher-membership-1',
			role: 'teacher',
		});
		staffRepository.listSubjectAssignments.mockResolvedValue([sectionSubjectRow]);
		homeworkRepository.listForSectionSubjects.mockResolvedValue([
			{
				...sectionSubjectRow,
				assignment: homeworkRecord,
				submittedCount: 12,
				teacherName: 'sana_iqbal',
			},
		]);

		const result = await service.list('teacher-user', 'tenant-1', {});

		expect(result.assignments).toHaveLength(1);
		expect(result.assignments[0]?.title).toBe('Chapter 3 exercises');
		expect(result.assignments[0]?.submittedCount).toBe(12);
		expect(result.assignments[0]?.teacherName).toBe('sana_iqbal');
		expect(homeworkRepository.listForSectionSubjects).toHaveBeenCalledWith(
			'tenant-1',
			['section-subject-1'],
			{},
		);
	});

	it('denies homework access when teacher is not assigned to the subject', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'teacher-membership-2',
			role: 'teacher',
		});
		staffRepository.teacherCanAccessSectionSubject.mockResolvedValue(false);
		homeworkRepository.findById.mockResolvedValue({
			...sectionSubjectRow,
			assignment: homeworkRecord,
		});

		await expect(service.getById('teacher-user', 'tenant-1', 'homework-1')).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});

	it('creates homework for an assigned section subject', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'teacher-membership-1',
			role: 'teacher',
		});
		staffRepository.teacherCanAccessSectionSubject.mockResolvedValue(true);
		staffRepository.findSectionSubjectById.mockResolvedValue(sectionSubjectRow);
		homeworkRepository.create.mockResolvedValue(homeworkRecord);
		homeworkRepository.findById.mockResolvedValue({
			...sectionSubjectRow,
			assignment: homeworkRecord,
		});

		const result = await service.create('teacher-user', 'tenant-1', {
			sectionSubjectId: 'section-subject-1',
			title: 'Chapter 3 exercises',
			status: 'published',
		});

		expect(result.assignment.title).toBe('Chapter 3 exercises');
		expect(homeworkRepository.create).toHaveBeenCalled();
	});

	it('throws when homework is missing', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'teacher-membership-1',
			role: 'teacher',
		});
		homeworkRepository.findById.mockResolvedValue(null);

		await expect(service.getById('teacher-user', 'tenant-1', 'missing')).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});
});
