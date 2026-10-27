import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccessScopeService } from '@/modules/access-scope/access-scope.service';
import { AcademicRepository } from '@/modules/academic/academic.repository';
import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';

const sectionRecord = {
	id: 'section-1',
	tenantId: 'tenant-1',
	campusId: 'campus-1',
	classId: 'class-1',
	academicYearId: 'year-1',
	name: '7-B',
	homeroomTeacherMembershipId: 'teacher-membership-1',
	status: 'active' as const,
	deletedAt: null,
	createdAt: new Date('2026-07-23T00:00:00.000Z'),
	updatedAt: new Date('2026-07-23T00:00:00.000Z'),
};

const sessionRecord = {
	id: 'session-1',
	tenantId: 'tenant-1',
	campusId: 'campus-1',
	sectionId: 'section-1',
	sessionType: 'class' as const,
	sessionDate: '2026-07-23',
	startsAt: null,
	endsAt: null,
	createdAt: new Date('2026-07-23T00:00:00.000Z'),
	updatedAt: new Date('2026-07-23T00:00:00.000Z'),
};

describe('AttendanceService', () => {
	let service: AttendanceService;
	let attendanceRepository: {
		findSessionBySectionAndDate: ReturnType<typeof vi.fn>;
		findSessionById: ReturnType<typeof vi.fn>;
		createSession: ReturnType<typeof vi.fn>;
		listMarksForSession: ReturnType<typeof vi.fn>;
		markStudents: ReturnType<typeof vi.fn>;
		countMarksByDateAndStatus: ReturnType<typeof vi.fn>;
		countStudentsByEventSource: ReturnType<typeof vi.fn>;
		listCheckInsForDate: ReturnType<typeof vi.fn>;
	};
	let academicRepository: {
		findSectionById: ReturnType<typeof vi.fn>;
	};
	let studentsRepository: {
		findStudentById: ReturnType<typeof vi.fn>;
		findStudentsByIds: ReturnType<typeof vi.fn>;
		listEnrollments: ReturnType<typeof vi.fn>;
	};
	let staffRepository: {
		teacherHasHomeroomAccess: ReturnType<typeof vi.fn>;
		teacherHasSectionAccess: ReturnType<typeof vi.fn>;
		teacherCanAccessStudent: ReturnType<typeof vi.fn>;
	};
	let membershipsRepository: {
		findActiveByTenantAndUser: ReturnType<typeof vi.fn>;
		listRolesForMembership: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		attendanceRepository = {
			findSessionBySectionAndDate: vi.fn(),
			findSessionById: vi.fn(),
			createSession: vi.fn(),
			listMarksForSession: vi.fn(),
			markStudents: vi.fn(),
			countMarksByDateAndStatus: vi.fn().mockResolvedValue([]),
			countStudentsByEventSource: vi.fn().mockResolvedValue([]),
			listCheckInsForDate: vi.fn().mockResolvedValue([]),
		};
		academicRepository = {
			findSectionById: vi.fn(),
		};
		studentsRepository = {
			findStudentById: vi.fn(),
			findStudentsByIds: vi.fn(),
			listEnrollments: vi.fn(),
		};
		staffRepository = {
			teacherHasHomeroomAccess: vi.fn(),
			teacherHasSectionAccess: vi.fn(),
			teacherCanAccessStudent: vi.fn(),
		};
		membershipsRepository = {
			findActiveByTenantAndUser: vi.fn(),
			listRolesForMembership: vi.fn().mockResolvedValue([]),
		};

		service = new AttendanceService(
			attendanceRepository as unknown as AttendanceRepository,
			academicRepository as unknown as AcademicRepository,
			studentsRepository as unknown as StudentsRepository,
			new MembershipsService(
				membershipsRepository as unknown as MembershipsRepository,
				createMockPermissionsService(),
			),
			staffRepository as unknown as StaffRepository,
			{ requireStudentAccess: vi.fn() } as unknown as AccessScopeService,
		);
	});

	it('returns an existing session for readers', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'teacher-membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});
		academicRepository.findSectionById.mockResolvedValue(sectionRecord);
		staffRepository.teacherHasSectionAccess.mockResolvedValue(true);
		attendanceRepository.findSessionBySectionAndDate.mockResolvedValue(sessionRecord);
		attendanceRepository.listMarksForSession.mockResolvedValue([]);

		const result = await service.getOrCreateSession('user-1', 'tenant-1', {
			sectionId: 'section-1',
			sessionDate: '2026-07-23',
		});

		expect(result.session.id).toBe('session-1');
		expect(attendanceRepository.createSession).not.toHaveBeenCalled();
	});

	it('blocks unassigned teachers from marking attendance', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'other-teacher',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});
		attendanceRepository.findSessionById.mockResolvedValue(sessionRecord);
		academicRepository.findSectionById.mockResolvedValue(sectionRecord);
		staffRepository.teacherHasHomeroomAccess.mockResolvedValue(false);

		await expect(
			service.markAttendance('user-1', 'tenant-1', 'session-1', {
				marks: [{ studentId: 'student-1', status: 'present' }],
			}),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('marks attendance for assigned homeroom teachers', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'teacher-membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});
		attendanceRepository.findSessionById.mockResolvedValue(sessionRecord);
		academicRepository.findSectionById.mockResolvedValue(sectionRecord);
		staffRepository.teacherHasHomeroomAccess.mockResolvedValue(true);
		studentsRepository.listEnrollments.mockResolvedValue([
			{
				id: 'enrollment-1',
				studentId: 'student-1',
				sectionId: 'section-1',
				status: 'active',
			},
		]);
		studentsRepository.findStudentsByIds.mockResolvedValue([
			{ id: 'student-1', tenantId: 'tenant-1' },
		]);
		attendanceRepository.markStudents.mockResolvedValue([
			{
				id: 'mark-1',
				tenantId: 'tenant-1',
				sessionId: 'session-1',
				studentId: 'student-1',
				status: 'present',
				markedAt: new Date('2026-07-23T08:00:00.000Z'),
				markedByMembershipId: 'teacher-membership-1',
				createdAt: new Date('2026-07-23T08:00:00.000Z'),
				updatedAt: new Date('2026-07-23T08:00:00.000Z'),
			},
		]);

		const result = await service.markAttendance('user-1', 'tenant-1', 'session-1', {
			marks: [{ studentId: 'student-1', status: 'present' }],
		});

		expect(result.marks).toHaveLength(1);
		expect(result.summary.present).toBe(1);
	});

	it('confirmAllPresent marks every enrolled student present', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'teacher-membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		});
		attendanceRepository.findSessionById.mockResolvedValue(sessionRecord);
		academicRepository.findSectionById.mockResolvedValue(sectionRecord);
		staffRepository.teacherHasHomeroomAccess.mockResolvedValue(true);
		studentsRepository.listEnrollments.mockResolvedValue([
			{
				id: 'enrollment-1',
				studentId: 'student-1',
				sectionId: 'section-1',
				status: 'active',
			},
			{
				id: 'enrollment-2',
				studentId: 'student-2',
				sectionId: 'section-1',
				status: 'active',
			},
		]);
		attendanceRepository.markStudents.mockResolvedValue([]);
		attendanceRepository.listMarksForSession.mockResolvedValue([
			{
				id: 'mark-1',
				tenantId: 'tenant-1',
				sessionId: 'session-1',
				studentId: 'student-1',
				status: 'present',
				markedAt: new Date('2026-07-23T08:00:00.000Z'),
				markedByMembershipId: 'teacher-membership-1',
				createdAt: new Date('2026-07-23T08:00:00.000Z'),
				updatedAt: new Date('2026-07-23T08:00:00.000Z'),
			},
			{
				id: 'mark-2',
				tenantId: 'tenant-1',
				sessionId: 'session-1',
				studentId: 'student-2',
				status: 'present',
				markedAt: new Date('2026-07-23T08:00:00.000Z'),
				markedByMembershipId: 'teacher-membership-1',
				createdAt: new Date('2026-07-23T08:00:00.000Z'),
				updatedAt: new Date('2026-07-23T08:00:00.000Z'),
			},
		]);

		const result = await service.confirmAllPresent('user-1', 'tenant-1', 'session-1', {});

		expect(attendanceRepository.markStudents).toHaveBeenCalledWith(
			expect.objectContaining({
				marks: [
					{ studentId: 'student-1', status: 'present' },
					{ studentId: 'student-2', status: 'present' },
				],
			}),
		);
		expect(result.summary.present).toBe(2);
	});

	it('rejects invalid student ids', async () => {
		membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
			id: 'membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'owner',
			status: 'active',
		});
		attendanceRepository.findSessionById.mockResolvedValue(sessionRecord);
		academicRepository.findSectionById.mockResolvedValue(sectionRecord);
		studentsRepository.listEnrollments.mockResolvedValue([]);
		studentsRepository.findStudentsByIds.mockResolvedValue([]);

		await expect(
			service.markAttendance('user-1', 'tenant-1', 'session-1', {
				marks: [{ studentId: 'student-missing', status: 'present' }],
			}),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	describe('getOverview', () => {
		const principal = {
			id: 'principal-membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'principal',
			status: 'active',
		};

		it('returns last week and this week, Monday to Sunday, with rates and today', async () => {
			membershipsRepository.findActiveByTenantAndUser.mockResolvedValue(principal);
			attendanceRepository.countMarksByDateAndStatus.mockResolvedValue([
				{ sessionDate: '2026-10-08', status: 'present', count: 9 },
				{ sessionDate: '2026-10-08', status: 'absent', count: 1 },
				{ sessionDate: '2026-10-01', status: 'late', count: 2 },
			]);
			attendanceRepository.countStudentsByEventSource.mockResolvedValue([
				{ source: 'manual', count: 10 },
			]);

			const result = await service.getOverview('user-1', 'tenant-1', '2026-10-08');

			expect(attendanceRepository.countMarksByDateAndStatus).toHaveBeenCalledWith(
				'tenant-1',
				'2026-09-28',
				'2026-10-11',
			);
			expect(result.days).toHaveLength(14);
			expect(result.days[0]?.date).toBe('2026-09-28');
			expect(result.days.at(-1)?.date).toBe('2026-10-11');
			expect(result.today.attendanceRate).toBe(90);
			expect(result.days.find((day) => day.date === '2026-10-01')?.attendanceRate).toBe(100);
			expect(result.days.find((day) => day.date === '2026-10-02')?.attendanceRate).toBeNull();
			expect(result.checkInSources).toEqual([{ source: 'manual', count: 10 }]);
		});

		it('is limited to leadership roles', async () => {
			membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
				...principal,
				role: 'teacher',
			});

			await expect(service.getOverview('user-1', 'tenant-1', '2026-10-08')).rejects.toBeInstanceOf(
				ForbiddenException,
			);
		});
	});
});
