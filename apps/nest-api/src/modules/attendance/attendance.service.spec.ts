import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccessScopeService } from '@/modules/access-scope/access-scope.service';
import { AcademicRepository } from '@/modules/academic/academic.repository';
import { createMockPermissionsService } from '@/modules/authorization/testing/mock-permissions.service';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { type AttendancePolicy, defaultAttendancePolicy } from '@/modules/rules/attendance-policy';
import type { RulesService } from '@/modules/rules/rules.service';
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
		countMarksBySectionAndStatus: ReturnType<typeof vi.fn>;
		listStudentsOverThreshold: ReturnType<typeof vi.fn>;
		findActiveAcademicYear: ReturnType<typeof vi.fn>;
		listSessionStudentContext: ReturnType<typeof vi.fn>;
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
	let rulesService: { getAttendancePolicy: ReturnType<typeof vi.fn> };
	const withPolicy = (policy: AttendancePolicy) =>
		rulesService.getAttendancePolicy.mockResolvedValue({
			policy,
			clock: { timeZone: 'Asia/Karachi', quietHours: { start: '22:00', end: '07:00' } },
		});
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
			countMarksBySectionAndStatus: vi.fn().mockResolvedValue([]),
			listStudentsOverThreshold: vi.fn().mockResolvedValue([]),
			findActiveAcademicYear: vi.fn().mockResolvedValue(null),
			listSessionStudentContext: vi
				.fn()
				.mockResolvedValue([
					{ studentId: 'student-1', guardianName: 'Ayesha Khan', checkInSource: 'manual' },
				]),
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
		rulesService = { getAttendancePolicy: vi.fn() };
		// No edit limit unless a test sets one, so marking tests do not depend on today's date.
		withPolicy({ ...defaultAttendancePolicy(), teacherEditWindowHours: null });
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
			rulesService as unknown as RulesService,
		);
	});

	describe('edit window', () => {
		const teacher = {
			id: 'teacher-membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'teacher',
			status: 'active',
		};

		beforeEach(() => {
			withPolicy({ ...defaultAttendancePolicy(), teacherEditWindowHours: 24 });
			attendanceRepository.findSessionById.mockResolvedValue(sessionRecord);
			academicRepository.findSectionById.mockResolvedValue(sectionRecord);
			staffRepository.teacherHasHomeroomAccess.mockResolvedValue(true);
		});

		it('stops teachers changing a day once the window has closed', async () => {
			membershipsRepository.findActiveByTenantAndUser.mockResolvedValue(teacher);
			vi.useFakeTimers({
				now: new Date(`${sessionRecord.sessionDate}T00:00:00Z`).getTime() + 3 * 86_400_000,
			});
			try {
				await expect(
					service.markAttendance('user-1', 'tenant-1', 'session-1', {
						marks: [{ studentId: 'student-1', status: 'late' }],
					}),
				).rejects.toMatchObject({ response: { code: 'ATTENDANCE_EDIT_WINDOW_CLOSED' } });
				expect(attendanceRepository.markStudents).not.toHaveBeenCalled();
			} finally {
				vi.useRealTimers();
			}
		});

		it('lets leadership correct marks after the window and says so on the session', async () => {
			membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
				...teacher,
				role: 'principal',
			});
			attendanceRepository.listMarksForSession.mockResolvedValue([]);
			vi.useFakeTimers({
				now: new Date(`${sessionRecord.sessionDate}T00:00:00Z`).getTime() + 3 * 86_400_000,
			});
			try {
				const result = await service.getSession('user-1', 'tenant-1', 'session-1');
				expect(result.rules).toMatchObject({
					rollCallClosesAt: '09:00',
					lateFrom: '08:30',
					canEdit: true,
				});
			} finally {
				vi.useRealTimers();
			}
		});

		it('tells a teacher the day is still open inside the window', async () => {
			membershipsRepository.findActiveByTenantAndUser.mockResolvedValue(teacher);
			staffRepository.teacherHasSectionAccess.mockResolvedValue(true);
			attendanceRepository.listMarksForSession.mockResolvedValue([]);
			// Roll call closes 09:00 local (04:00 UTC); an hour later is well inside 24 hours.
			vi.useFakeTimers({ now: new Date(`${sessionRecord.sessionDate}T05:00:00Z`).getTime() });
			try {
				const result = await service.getSession('user-1', 'tenant-1', 'session-1');
				expect(result.rules.canEdit).toBe(true);
				expect(result.rules.editableUntil).toBe(
					new Date(Date.parse(`${sessionRecord.sessionDate}T04:00:00Z`) + 86_400_000).toISOString(),
				);
			} finally {
				vi.useRealTimers();
			}
		});
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
		expect(attendanceRepository.listSessionStudentContext).toHaveBeenCalledWith(
			'tenant-1',
			'session-1',
			'section-1',
		);
		expect(result.students).toEqual([
			{ studentId: 'student-1', guardianName: 'Ayesha Khan', checkInSource: 'manual' },
		]);
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
	describe('getReport', () => {
		const principal = {
			id: 'principal-membership-1',
			tenantId: 'tenant-1',
			userId: 'user-1',
			role: 'principal',
			status: 'active',
		};

		it('reports the running month against the same span of the previous month', async () => {
			membershipsRepository.findActiveByTenantAndUser.mockResolvedValue(principal);
			attendanceRepository.countMarksByDateAndStatus
				.mockResolvedValueOnce([
					{ sessionDate: '2026-10-05', status: 'present', count: 8 },
					{ sessionDate: '2026-10-05', status: 'late', count: 1 },
					{ sessionDate: '2026-10-06', status: 'absent', count: 1 },
					{ sessionDate: '2026-10-06', status: 'late', count: 2 },
				])
				.mockResolvedValueOnce([{ sessionDate: '2026-09-07', status: 'present', count: 4 }]);
			attendanceRepository.countMarksBySectionAndStatus.mockResolvedValue([
				{ sectionId: 's-b', sectionName: '7-B', className: 'Grade 7', status: 'present', count: 3 },
				{ sectionId: 's-a', sectionName: '7-A', className: 'Grade 7', status: 'present', count: 5 },
				{ sectionId: 's-b', sectionName: '7-B', className: 'Grade 7', status: 'absent', count: 1 },
			]);

			const result = await service.getReport(
				'user-1',
				'tenant-1',
				'month',
				'2026-10-08',
				'2026-10-08',
			);

			expect(result.from).toBe('2026-10-01');
			expect(result.to).toBe('2026-10-08');
			expect(result.previous).toEqual({ from: '2026-09-01', to: '2026-09-08' });
			expect(result.schoolDays).toBe(2);
			expect(result.summary.late).toBe(3);
			expect(result.previousAttendanceRate).toBe(100);
			expect(result.byClass.map((row) => [row.sectionName, row.attendanceRate])).toEqual([
				['7-A', 100],
				['7-B', 75],
			]);
			expect(result.lateByWeekday).toEqual([
				{ dayOfWeek: 1, count: 1 },
				{ dayOfWeek: 2, count: 2 },
				{ dayOfWeek: 3, count: 0 },
				{ dayOfWeek: 4, count: 0 },
				{ dayOfWeek: 5, count: 0 },
			]);
			expect(attendanceRepository.listStudentsOverThreshold).toHaveBeenCalledWith(
				'tenant-1',
				'2026-10-01',
				'2026-10-08',
				{ absences: 3, late: 4 },
				25,
			);
		});

		it('caps the previous span at the end of a shorter month', async () => {
			membershipsRepository.findActiveByTenantAndUser.mockResolvedValue(principal);

			const result = await service.getReport(
				'user-1',
				'tenant-1',
				'month',
				'2026-03-31',
				'2026-04-15',
			);

			expect(result.to).toBe('2026-03-31');
			expect(result.previous).toEqual({ from: '2026-02-01', to: '2026-02-28' });
		});

		it('uses the active academic year with no comparison for the year period', async () => {
			membershipsRepository.findActiveByTenantAndUser.mockResolvedValue(principal);
			attendanceRepository.findActiveAcademicYear.mockResolvedValue({
				startsOn: '2026-08-15',
				endsOn: '2027-06-15',
			});

			const result = await service.getReport(
				'user-1',
				'tenant-1',
				'year',
				'2026-10-08',
				'2026-10-08',
			);

			expect(result).toMatchObject({ from: '2026-08-15', to: '2026-10-08', previous: null });
			expect(result.previousSummary).toBeNull();
		});

		it('is limited to leadership roles', async () => {
			membershipsRepository.findActiveByTenantAndUser.mockResolvedValue({
				...principal,
				role: 'teacher',
			});

			await expect(
				service.getReport('user-1', 'tenant-1', 'week', '2026-10-08', '2026-10-08'),
			).rejects.toBeInstanceOf(ForbiddenException);
		});
	});
});
