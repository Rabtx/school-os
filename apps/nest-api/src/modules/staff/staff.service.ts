import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { countMarksByStatus } from '@/modules/attendance/attendance.types';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { toPublicEnrollment, toPublicStudent } from '@/modules/students/students.types';
import type { TenantContext } from '@/modules/tenants/tenant-context.types';
import { TimetableService } from '@/modules/timetable/timetable.service';
import type { PublicTeacherDaySchedule } from '@/modules/timetable/timetable.types';
import type {
	AssignSectionSubjectInput,
	CreateSubjectInput,
	UpsertStaffProfileInput,
} from './staff.dto';
import { StaffRepository } from './staff.repository';
import { RECENT_ATTENDANCE_DAYS, summarizeRecentAttendance } from './teacher-recent-attendance';
import {
	type PublicTeacher,
	type PublicTeacherDashboard,
	type PublicTeacherDashboardAlert,
	type PublicTeacherDashboardAttendanceSummary,
	type PublicTeacherDashboardPriorityAction,
	type PublicTeacherDashboardSection,
	toPublicSectionSubjectOption,
	toPublicStaffProfile,
	toPublicSubject,
	toPublicSubjectAssignment,
} from './staff.types';
import { findConsecutiveAbsenceAlerts, subtractWeekdays } from './teacher-attendance-alerts';
import { findUpcomingClassPeriod } from './teacher-dashboard-digest';

@Injectable()
export class StaffService {
	constructor(
		private readonly staff: StaffRepository,
		private readonly membershipAccess: MembershipsService,
		private readonly timetable: TimetableService,
	) {}

	async listTeachers(userId: string, tenantId: string) {
		const membership = await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.STAFF_READ,
		);
		if (!(await this.membershipAccess.isManagementMember(membership))) {
			throw new ForbiddenException({
				code: 'STAFF_DIRECTORY_FORBIDDEN',
				message: 'Teacher directory is only available to administrators',
			});
		}
		const rows = await this.staff.listTeachers(tenantId);
		const teachers: PublicTeacher[] = await Promise.all(
			rows.map(async (row) => {
				const [homeroom, assignments] = await Promise.all([
					this.staff.listHomeroomSections(tenantId, row.membership.id),
					this.staff.listSubjectAssignments(tenantId, row.membership.id),
				]);
				return {
					membershipId: row.membership.id,
					userId: row.user.id,
					email: row.user.email,
					username: row.user.username,
					role: row.membership.role,
					campusId: row.membership.campusId,
					profile: toPublicStaffProfile(row.membership.id, row.profile),
					homeroomSectionCount: homeroom.length,
					subjectAssignmentCount: assignments.length,
				};
			}),
		);
		return { teachers };
	}

	async getTeacher(userId: string, tenantId: string, membershipId: string) {
		const membership = await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.STAFF_READ,
		);
		if (
			!(await this.membershipAccess.isManagementMember(membership)) &&
			membership.id !== membershipId
		) {
			throw new ForbiddenException({
				code: 'STAFF_PROFILE_FORBIDDEN',
				message: 'You can only view your own teacher profile',
			});
		}
		return this.buildTeacherDetail(tenantId, membershipId);
	}

	async getMyTeacherProfile(tenant: TenantContext) {
		if (!tenant.roles.includes('teacher')) {
			throw new NotFoundException({
				code: 'TEACHER_PROFILE_NOT_FOUND',
				message: 'Teacher profile not available for this account',
			});
		}
		return this.buildTeacherDetail(tenant.tenantId, tenant.membershipId);
	}

	async getMySectionStudents(tenant: TenantContext, sectionId: string) {
		await this.requireTeacherSectionAccess(tenant, sectionId);
		const rows = await this.staff.listSectionRoster(tenant.tenantId, sectionId);
		return {
			students: rows.map((row) => ({
				student: toPublicStudent(row.student),
				enrollment: toPublicEnrollment(row.enrollment),
			})),
		};
	}

	async getMyTeacherDashboard(
		tenant: TenantContext,
		sessionDate: string,
	): Promise<PublicTeacherDashboard> {
		const detail = await this.getMyTeacherProfile(tenant);
		const accessibleSections = detail.accessibleSections;
		const homeroomSections = accessibleSections.filter(
			(section) => section.accessType === 'homeroom',
		);
		const sectionIds = [...new Set(accessibleSections.map((section) => section.id))];
		const homeroomSectionIds = homeroomSections.map((section) => section.id);

		const [enrollmentCounts, sessions, absenceHistory, recentMarks] = await Promise.all([
			this.staff.countActiveEnrollmentsBySections(tenant.tenantId, sectionIds),
			this.staff.findSessionsBySectionsAndDate(tenant.tenantId, homeroomSectionIds, sessionDate),
			homeroomSectionIds.length > 0
				? this.staff.listHomeroomAttendanceHistory(
						tenant.tenantId,
						homeroomSectionIds,
						subtractWeekdays(sessionDate, 12),
						sessionDate,
					)
				: Promise.resolve([]),
			this.staff.countSectionMarksByDay(
				tenant.tenantId,
				sectionIds,
				subtractWeekdays(sessionDate, RECENT_ATTENDANCE_DAYS - 1),
				sessionDate,
			),
		]);
		const recentAttendanceBySection = summarizeRecentAttendance(recentMarks);

		const sessionBySectionId = new Map(
			sessions
				.filter((session) => session.sectionId)
				.map((session) => [session.sectionId as string, session]),
		);
		const sessionIds = sessions.map((session) => session.id);
		const marks = await this.staff.listMarksForSessions(tenant.tenantId, sessionIds);
		const marksBySessionId = new Map<string, typeof marks>();
		for (const mark of marks) {
			const bucket = marksBySessionId.get(mark.sessionId) ?? [];
			bucket.push(mark);
			marksBySessionId.set(mark.sessionId, bucket);
		}

		const sections: PublicTeacherDashboardSection[] = accessibleSections.map((section) => {
			const studentCount = enrollmentCounts.get(section.id) ?? 0;
			const recentAttendance = recentAttendanceBySection.get(section.id) ?? {
				rate: null,
				days: [],
			};
			if (section.accessType !== 'homeroom') {
				return {
					section,
					studentCount,
					recentAttendance,
					todayAttendance: {
						sessionId: null,
						isComplete: true,
						summary: null,
					},
				};
			}

			const session = sessionBySectionId.get(section.id) ?? null;
			const sessionMarks = session ? (marksBySessionId.get(session.id) ?? []) : [];
			const rawSummary = session ? countMarksByStatus(sessionMarks) : null;
			const summary = rawSummary
				? this.toDashboardAttendanceSummary(rawSummary, studentCount)
				: null;
			const isComplete =
				studentCount === 0
					? true
					: Boolean(
							session && rawSummary && rawSummary.unknown === 0 && rawSummary.total >= studentCount,
						);

			return {
				section,
				studentCount,
				recentAttendance,
				todayAttendance: {
					sessionId: session?.id ?? null,
					isComplete,
					summary,
				},
			};
		});

		const homeroomDashboardSections = sections.filter(
			(item) => item.section.accessType === 'homeroom',
		);
		const priorityActions = this.buildTeacherPriorityActions(homeroomDashboardSections);
		const totalStudents = sections.reduce((count, item) => count + item.studentCount, 0);
		const attendanceTotals = homeroomDashboardSections.reduce(
			(acc, item) => {
				if (!item.todayAttendance.isComplete) acc.pendingAttendanceCount += 1;
				const summary = item.todayAttendance.summary;
				if (summary) {
					acc.todayPresent += summary.present;
					acc.todayAbsent += summary.absent;
					acc.todayLate += summary.late;
					acc.markedStudents += summary.total - summary.unknown;
				}
				return acc;
			},
			{
				pendingAttendanceCount: 0,
				todayPresent: 0,
				todayAbsent: 0,
				todayLate: 0,
				markedStudents: 0,
			},
		);

		const homeroomCount = accessibleSections.filter(
			(section) => section.accessType === 'homeroom',
		).length;
		const subjectCount = accessibleSections.filter(
			(section) => section.accessType === 'subject',
		).length;

		let todaySchedule: PublicTeacherDaySchedule | null = null;
		if (tenant.roles.includes('teacher')) {
			try {
				todaySchedule = await this.timetable.getMyDaySchedule(tenant, sessionDate);
			} catch {
				todaySchedule = null;
			}
		}

		const absenceAlerts: PublicTeacherDashboardAlert[] = findConsecutiveAbsenceAlerts(
			absenceHistory.filter(
				(row): row is typeof row & { sectionId: string } => row.sectionId != null,
			),
		).map((alert) => ({
			type: 'consecutive_absence',
			studentId: alert.studentId,
			studentName: alert.studentName,
			sectionId: alert.sectionId,
			sectionLabel: alert.sectionLabel,
			consecutiveDays: alert.consecutiveDays,
		}));

		const pendingTaskCount = priorityActions.length;

		const sectionSubjectIds = detail.subjectAssignments.map((row) => row.id);
		const yesterdayDate = subtractWeekdays(sessionDate, 1);
		const [draftHomeworkCount, dueTodayHomeworkCount, yesterdaySessions, toReviewCount] =
			await Promise.all([
				this.staff.countHomeworkForSectionSubjects(tenant.tenantId, sectionSubjectIds, {
					status: 'draft',
				}),
				this.staff.countHomeworkForSectionSubjects(tenant.tenantId, sectionSubjectIds, {
					dueOnDate: sessionDate,
				}),
				homeroomSectionIds.length > 0
					? this.staff.findSessionsBySectionsAndDate(
							tenant.tenantId,
							homeroomSectionIds,
							yesterdayDate,
						)
					: Promise.resolve([]),
				this.staff.countHomeworkSubmissionsToReview(tenant.tenantId, sectionSubjectIds),
			]);

		const yesterdayMarkedSectionIds = new Set(
			yesterdaySessions
				.map((session) => session.sectionId)
				.filter((sectionId): sectionId is string => sectionId != null),
		);
		const yesterdayUnmarkedSections = homeroomSections
			.filter((section) => !yesterdayMarkedSectionIds.has(section.id))
			.map((section) => ({
				sectionId: section.id,
				sectionName: section.name,
				classId: section.classId,
			}));

		const upcomingPeriod = findUpcomingClassPeriod(todaySchedule, sessionDate);

		return {
			sessionDate,
			teacher: detail.teacher,
			stats: {
				totalClasses: accessibleSections.length,
				homeroomCount,
				subjectCount,
				totalStudents,
				pendingAttendanceCount: attendanceTotals.pendingAttendanceCount,
				todayPresent: attendanceTotals.todayPresent,
				todayAbsent: attendanceTotals.todayAbsent,
				todayLate: attendanceTotals.todayLate,
				todayAttendanceRate:
					attendanceTotals.markedStudents > 0
						? Math.round((attendanceTotals.todayPresent / attendanceTotals.markedStudents) * 100)
						: null,
				todayPeriodCount: todaySchedule?.classCount ?? 0,
				alertCount: absenceAlerts.length,
				pendingTaskCount,
			},
			sections,
			priorityActions,
			alerts: absenceAlerts,
			todaySchedule,
			morningDigest: {
				draftHomeworkCount,
				toReviewCount,
				dueTodayHomeworkCount,
				upcomingPeriod,
				yesterdayUnmarkedSections,
			},
		};
	}

	async upsertMyTeacherProfile(tenant: TenantContext, input: UpsertStaffProfileInput) {
		if (!tenant.roles.includes('teacher')) {
			throw new NotFoundException({
				code: 'TEACHER_PROFILE_NOT_FOUND',
				message: 'Teacher profile not available for this account',
			});
		}
		return this.upsertTeacherProfileFields(tenant.tenantId, tenant.membershipId, {
			phone: input.phone,
			qualification: input.qualification,
			specialization: input.specialization,
			notes: input.notes,
		});
	}

	async upsertTeacherProfile(
		userId: string,
		tenantId: string,
		membershipId: string,
		input: UpsertStaffProfileInput,
	) {
		await this.membershipAccess.requirePermission(userId, tenantId, PermissionCodes.STAFF_WRITE);
		const membership = await this.staff.findMembership(tenantId, membershipId);
		if (!membership || membership.role !== 'teacher') {
			throw new NotFoundException({
				code: 'TEACHER_NOT_FOUND',
				message: 'Teacher membership not found',
			});
		}

		return this.upsertTeacherProfileFields(tenantId, membershipId, input);
	}

	async listSectionSubjects(userId: string, tenantId: string, campusId?: string) {
		await this.membershipAccess.requirePermission(userId, tenantId, PermissionCodes.ACADEMIC_READ);
		const rows = await this.staff.listAllSectionSubjects(tenantId, campusId);
		return { sectionSubjects: rows.map(toPublicSectionSubjectOption) };
	}

	async listSubjects(userId: string, tenantId: string) {
		await this.membershipAccess.requirePermission(userId, tenantId, PermissionCodes.STAFF_READ);
		const rows = await this.staff.listSubjects(tenantId);
		return { subjects: rows.map(toPublicSubject) };
	}

	async createSubject(userId: string, tenantId: string, input: CreateSubjectInput) {
		await this.membershipAccess.requirePermission(userId, tenantId, PermissionCodes.STAFF_WRITE);
		try {
			const subject = await this.staff.createSubject({
				tenantId,
				code: input.code.trim().toUpperCase(),
				name: input.name.trim(),
				description: input.description?.trim() ?? null,
			});
			return { subject: toPublicSubject(subject) };
		} catch {
			throw new ConflictException({
				code: 'SUBJECT_CODE_ALREADY_EXISTS',
				message: 'A subject with this code already exists',
			});
		}
	}

	async assignSectionSubject(userId: string, tenantId: string, input: AssignSectionSubjectInput) {
		await this.membershipAccess.requirePermission(userId, tenantId, PermissionCodes.STAFF_WRITE);
		const teacher = await this.staff.findMembership(tenantId, input.teacherMembershipId);
		if (!teacher || teacher.role !== 'teacher') {
			throw new BadRequestException({
				code: 'INVALID_TEACHER',
				message: 'Subject teacher must be an active teacher membership',
			});
		}
		try {
			const assignment = await this.staff.assignSectionSubject({
				tenantId,
				sectionId: input.sectionId,
				subjectId: input.subjectId,
				teacherMembershipId: input.teacherMembershipId,
			});
			return { assignment };
		} catch {
			throw new ConflictException({
				code: 'SECTION_SUBJECT_ALREADY_EXISTS',
				message: 'This subject is already assigned to the section',
			});
		}
	}

	private async buildTeacherDetail(tenantId: string, membershipId: string) {
		const row = await this.staff.findTeacherByMembershipId(tenantId, membershipId);
		if (!row) {
			throw new NotFoundException({
				code: 'TEACHER_NOT_FOUND',
				message: 'Teacher not found',
			});
		}
		const [homeroomSections, subjectAssignments] = await Promise.all([
			this.staff.listHomeroomSections(tenantId, membershipId),
			this.staff.listSubjectAssignments(tenantId, membershipId),
		]);
		return {
			teacher: {
				membershipId: row.membership.id,
				userId: row.user.id,
				email: row.user.email,
				username: row.user.username,
				role: row.membership.role,
				campusId: row.membership.campusId,
				profile: toPublicStaffProfile(membershipId, row.profile),
				homeroomSectionCount: homeroomSections.length,
				subjectAssignmentCount: subjectAssignments.length,
			},
			homeroomSections: homeroomSections.map((section) => ({
				id: section.id,
				name: section.name,
				campusId: section.campusId,
				classId: section.classId,
				academicYearId: section.academicYearId,
			})),
			subjectAssignments: subjectAssignments.map(toPublicSubjectAssignment),
			accessibleSections: this.buildAccessibleSections(homeroomSections, subjectAssignments),
		};
	}

	private buildAccessibleSections(
		homeroomSections: Awaited<ReturnType<StaffRepository['listHomeroomSections']>>,
		subjectAssignments: Awaited<ReturnType<StaffRepository['listSubjectAssignments']>>,
	) {
		const homeroomIds = new Set(homeroomSections.map((section) => section.id));
		const items: Array<{
			id: string;
			name: string;
			campusId: string;
			classId: string;
			academicYearId: string;
			accessType: 'homeroom' | 'subject';
			subjectId: string | null;
			subjectName: string | null;
			subjectCode: string | null;
		}> = homeroomSections.map((section) => ({
			id: section.id,
			name: section.name,
			campusId: section.campusId,
			classId: section.classId,
			academicYearId: section.academicYearId,
			accessType: 'homeroom' as const,
			subjectId: null,
			subjectName: null,
			subjectCode: null,
		}));

		for (const assignment of subjectAssignments) {
			if (homeroomIds.has(assignment.section.id)) continue;
			items.push({
				id: assignment.section.id,
				name: assignment.section.name,
				campusId: assignment.section.campusId,
				classId: assignment.section.classId,
				academicYearId: assignment.section.academicYearId,
				accessType: 'subject',
				subjectId: assignment.subject.id,
				subjectName: assignment.subject.name,
				subjectCode: assignment.subject.code,
			});
		}

		return items;
	}

	private toDashboardAttendanceSummary(
		summary: ReturnType<typeof countMarksByStatus>,
		studentCount: number,
	): PublicTeacherDashboardAttendanceSummary {
		const marked = summary.total - summary.unknown;
		return {
			present: summary.present,
			absent: summary.absent,
			late: summary.late,
			excused: summary.excused,
			leftEarly: summary.leftEarly,
			unknown: summary.unknown,
			total: summary.total,
			attendanceRate:
				studentCount > 0 && marked > 0 ? Math.round((summary.present / marked) * 100) : null,
		};
	}

	private buildTeacherPriorityActions(
		sections: PublicTeacherDashboardSection[],
	): PublicTeacherDashboardPriorityAction[] {
		const actions: PublicTeacherDashboardPriorityAction[] = [];

		for (const item of sections) {
			if (item.section.accessType !== 'homeroom') continue;

			const label = item.section.name;
			if (!item.todayAttendance.isComplete && item.studentCount > 0) {
				actions.push({
					type: 'mark_attendance',
					sectionId: item.section.id,
					label,
					reason: item.todayAttendance.sessionId
						? `${item.todayAttendance.summary?.unknown ?? item.studentCount} students still unmarked`
						: 'Attendance not started for today',
				});
			} else if ((item.todayAttendance.summary?.absent ?? 0) > 0) {
				actions.push({
					type: 'review_absences',
					sectionId: item.section.id,
					label,
					reason: `${item.todayAttendance.summary?.absent} absent today`,
				});
			}
		}

		return actions.slice(0, 6);
	}

	private async upsertTeacherProfileFields(
		tenantId: string,
		membershipId: string,
		input: UpsertStaffProfileInput,
	) {
		const profile = await this.staff.upsertProfile({
			tenantId,
			membershipId,
			employeeCode: input.employeeCode?.trim().toUpperCase() ?? null,
			phone: input.phone?.trim() ?? null,
			qualification: input.qualification?.trim() ?? null,
			specialization: input.specialization?.trim() ?? null,
			hireDate: input.hireDate ?? null,
			status: input.status ?? 'active',
			notes: input.notes?.trim() ?? null,
		});
		return { profile: toPublicStaffProfile(membershipId, profile ?? null) };
	}

	private async requireTeacherSectionAccess(tenant: TenantContext, sectionId: string) {
		if (!tenant.roles.includes('teacher')) {
			throw new ForbiddenException({
				code: 'TEACHER_SECTION_FORBIDDEN',
				message: 'Section access is limited to teacher accounts',
			});
		}
		const section = await this.staff.findSectionById(tenant.tenantId, sectionId);
		if (!section) {
			throw new NotFoundException({
				code: 'SECTION_NOT_FOUND',
				message: 'Section not found',
			});
		}
		const hasAccess = await this.staff.teacherHasSectionAccess(
			tenant.tenantId,
			tenant.membershipId,
			sectionId,
		);
		if (!hasAccess) {
			throw new ForbiddenException({
				code: 'TEACHER_SECTION_FORBIDDEN',
				message: 'You are not assigned to this section',
			});
		}
		return section;
	}
}
