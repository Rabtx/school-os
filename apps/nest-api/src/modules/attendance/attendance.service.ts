import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import type { MembershipRecord } from '@/database/schema';
import { AccessScopeService } from '@/modules/access-scope/access-scope.service';
import { AcademicRepository } from '@/modules/academic/academic.repository';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { hasManagementRole, managementRoles } from '@/modules/memberships/membership-roles';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';
import type {
	ConfirmAllPresentInput,
	CreateAttendanceSessionInput,
	MarkAttendanceInput,
} from './attendance.dto';
import { AttendanceRepository } from './attendance.repository';
import {
	countMarksByStatus,
	countMarksByStatusRows,
	toPublicMark,
	toPublicSession,
} from './attendance.types';

@Injectable()
export class AttendanceService {
	constructor(
		private readonly attendance: AttendanceRepository,
		private readonly academic: AcademicRepository,
		private readonly students: StudentsRepository,
		private readonly membershipAccess: MembershipsService,
		private readonly staff: StaffRepository,
		private readonly accessScope: AccessScopeService,
	) {}

	async getOrCreateSession(userId: string, tenantId: string, input: CreateAttendanceSessionInput) {
		const section = await this.requireSection(tenantId, input.sectionId);
		const sessionDate = input.sessionDate;
		const membership = await this.requireRead(userId, tenantId);

		const existing = await this.attendance.findSessionBySectionAndDate(
			tenantId,
			input.sectionId,
			sessionDate,
		);
		if (existing) {
			await this.requireSectionReadAccess(tenantId, membership, section);
			return this.buildSessionResponse(tenantId, existing);
		}

		const markMembership = await this.requireMark(userId, tenantId);
		await this.requireSectionMarkAccess(tenantId, markMembership, section);

		const session = await this.attendance.createSession({
			tenantId,
			campusId: section.campusId,
			sectionId: input.sectionId,
			sessionType: input.sessionType ?? 'class',
			sessionDate,
		});
		if (!session) {
			throw new BadRequestException({
				code: 'ATTENDANCE_SESSION_CREATE_FAILED',
				message: 'Could not create attendance session',
			});
		}

		return this.buildSessionResponse(tenantId, session);
	}

	async getSession(userId: string, tenantId: string, sessionId: string) {
		const membership = await this.requireRead(userId, tenantId);
		const session = await this.requireSession(tenantId, sessionId);
		if (session.sectionId) {
			const section = await this.requireSection(tenantId, session.sectionId);
			await this.requireSectionReadAccess(tenantId, membership, section);
		}
		return this.buildSessionResponse(tenantId, session);
	}

	async findSession(
		userId: string,
		tenantId: string,
		filters: { sectionId: string; sessionDate: string },
	) {
		const membership = await this.requireRead(userId, tenantId);
		const section = await this.requireSection(tenantId, filters.sectionId);
		await this.requireSectionReadAccess(tenantId, membership, section);

		const session = await this.attendance.findSessionBySectionAndDate(
			tenantId,
			filters.sectionId,
			filters.sessionDate,
		);
		if (!session) {
			throw new NotFoundException({
				code: 'ATTENDANCE_SESSION_NOT_FOUND',
				message: 'Attendance session not found for this section and date',
			});
		}

		return this.buildSessionResponse(tenantId, session);
	}

	async markAttendance(
		userId: string,
		tenantId: string,
		sessionId: string,
		input: MarkAttendanceInput,
	) {
		const membership = await this.requireMark(userId, tenantId);
		const session = await this.requireSession(tenantId, sessionId);
		const section = session.sectionId
			? await this.requireSection(tenantId, session.sectionId)
			: null;

		if (section) {
			await this.requireSectionMarkAccess(tenantId, membership, section);
		}

		const enrolled = await this.students.listEnrollments(tenantId, {
			sectionId: session.sectionId ?? undefined,
		});
		const activeStudentIds = new Set(
			enrolled.filter((row) => row.status === 'active').map((row) => row.studentId),
		);

		const markStudentIds = input.marks.map((mark) => mark.studentId);
		const foundStudents = await this.students.findStudentsByIds(tenantId, markStudentIds);
		const foundStudentIds = new Set(foundStudents.map((student) => student.id));

		for (const mark of input.marks) {
			if (!foundStudentIds.has(mark.studentId)) {
				throw new NotFoundException({
					code: 'STUDENT_NOT_FOUND',
					message: `Student ${mark.studentId} not found`,
				});
			}
			if (session.sectionId && !activeStudentIds.has(mark.studentId)) {
				throw new BadRequestException({
					code: 'STUDENT_NOT_ENROLLED',
					message: 'Student is not actively enrolled in this section',
				});
			}
		}

		const marks = await this.attendance.markStudents({
			tenantId,
			session,
			marks: input.marks,
			markedByMembershipId: membership.id,
		});

		return {
			marks: marks.map(toPublicMark),
			summary: countMarksByStatus(marks),
		};
	}

	async confirmAllPresent(
		userId: string,
		tenantId: string,
		sessionId: string,
		input: ConfirmAllPresentInput = {},
	) {
		const membership = await this.requireMark(userId, tenantId);
		const session = await this.requireSession(tenantId, sessionId);
		const section = session.sectionId
			? await this.requireSection(tenantId, session.sectionId)
			: null;

		if (section) {
			await this.requireSectionMarkAccess(tenantId, membership, section);
		}

		if (!session.sectionId) {
			throw new BadRequestException({
				code: 'ATTENDANCE_SECTION_REQUIRED',
				message: 'Bulk confirm requires a section attendance session',
			});
		}

		const enrolled = await this.students.listEnrollments(tenantId, {
			sectionId: session.sectionId,
		});
		const activeStudentIds = enrolled
			.filter((row) => row.status === 'active')
			.map((row) => row.studentId);

		if (activeStudentIds.length === 0) {
			throw new BadRequestException({
				code: 'ATTENDANCE_ROSTER_EMPTY',
				message: 'No actively enrolled students in this section',
			});
		}

		const exceptSet = new Set(input.exceptStudentIds ?? []);
		for (const studentId of exceptSet) {
			if (!activeStudentIds.includes(studentId)) {
				throw new BadRequestException({
					code: 'STUDENT_NOT_ENROLLED',
					message: `Student ${studentId} is not actively enrolled in this section`,
				});
			}
		}

		const marks = activeStudentIds
			.filter((studentId) => !exceptSet.has(studentId))
			.map((studentId) => ({ studentId, status: 'present' as const }));

		await this.attendance.markStudents({
			tenantId,
			session,
			marks,
			markedByMembershipId: membership.id,
		});

		return this.buildSessionResponse(tenantId, session);
	}

	async getSchoolDayPulse(userId: string, tenantId: string, sessionDate: string) {
		const membership = await this.requireRead(userId, tenantId);
		if (!managementRoles.has(membership.role)) {
			const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
			if (!hasManagementRole(roles)) {
				throw new ForbiddenException({
					code: 'ATTENDANCE_PULSE_FORBIDDEN',
					message: 'School-wide attendance pulse is limited to leadership roles',
				});
			}
		}

		const sessions = await this.attendance.listSessionsForDate(tenantId, sessionDate);
		const sessionIds = sessions.map((session) => session.id);
		const statusRows = await this.attendance.countMarksByStatusForSessions(tenantId, sessionIds);

		const summary = countMarksByStatusRows(statusRows);

		const attended = summary.present + summary.late + summary.excused;
		const attendanceRate =
			summary.total > 0 ? Math.round((attended / summary.total) * 1000) / 10 : null;

		const sectionsWithSessions = new Set(
			sessions.map((session) => session.sectionId).filter(Boolean),
		).size;

		return {
			sessionDate,
			sessionsCount: sessions.length,
			sectionsWithSessions,
			summary,
			attendanceRate,
		};
	}

	async getStudentHistory(userId: string, tenantId: string, studentId: string, limit?: number) {
		const membership = await this.requireRead(userId, tenantId);
		const student = await this.students.findStudentById(tenantId, studentId);
		if (!student) {
			throw new NotFoundException({
				code: 'STUDENT_NOT_FOUND',
				message: 'Student not found',
			});
		}
		await this.accessScope.requireStudentAccess(tenantId, membership, studentId);

		const rows = await this.attendance.listMarksForStudent(tenantId, studentId, limit ?? 50);
		return {
			history: rows.map((row) => ({
				mark: toPublicMark(row.mark),
				session: toPublicSession(row.session),
			})),
		};
	}

	private async buildSessionResponse(
		tenantId: string,
		session: NonNullable<Awaited<ReturnType<AttendanceRepository['findSessionById']>>>,
	) {
		const marks = await this.attendance.listMarksForSession(tenantId, session.id);
		return {
			session: toPublicSession(session),
			marks: marks.map(toPublicMark),
			summary: countMarksByStatus(marks),
		};
	}

	private async requireSectionMarkAccess(
		tenantId: string,
		membership: MembershipRecord,
		section: NonNullable<Awaited<ReturnType<AcademicRepository['findSectionById']>>>,
	) {
		if (managementRoles.has(membership.role)) return;
		if (membership.role !== 'teacher') {
			throw new ForbiddenException({
				code: 'ATTENDANCE_MARK_FORBIDDEN',
				message: 'You cannot mark attendance for this section',
			});
		}
		const hasAccess = await this.staff.teacherHasHomeroomAccess(
			tenantId,
			membership.id,
			section.id,
		);
		if (!hasAccess) {
			throw new ForbiddenException({
				code: 'ATTENDANCE_HOMEROOM_REQUIRED',
				message: 'Only the homeroom teacher can mark attendance for this section',
			});
		}
	}

	private async requireSectionReadAccess(
		tenantId: string,
		membership: MembershipRecord,
		section: NonNullable<Awaited<ReturnType<AcademicRepository['findSectionById']>>>,
	) {
		if (managementRoles.has(membership.role)) return;
		if (membership.role !== 'teacher') return;

		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		if (hasManagementRole(roles)) return;

		const hasAccess = await this.staff.teacherHasSectionAccess(tenantId, membership.id, section.id);
		if (!hasAccess) {
			throw new ForbiddenException({
				code: 'ATTENDANCE_SECTION_NOT_ASSIGNED',
				message: 'You are not assigned to this section',
			});
		}
	}

	private async requireRead(userId: string, tenantId: string) {
		return this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.ATTENDANCE_READ,
		);
	}

	private async requireMark(userId: string, tenantId: string) {
		return this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.ATTENDANCE_MARK,
		);
	}

	private async requireSession(tenantId: string, sessionId: string) {
		const session = await this.attendance.findSessionById(tenantId, sessionId);
		if (!session) {
			throw new NotFoundException({
				code: 'ATTENDANCE_SESSION_NOT_FOUND',
				message: 'Attendance session not found',
			});
		}
		return session;
	}

	private async requireSection(tenantId: string, sectionId: string) {
		const section = await this.academic.findSectionById(tenantId, sectionId);
		if (!section) {
			throw new NotFoundException({
				code: 'SECTION_NOT_FOUND',
				message: 'Section not found',
			});
		}
		return section;
	}
}
