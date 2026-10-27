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

const OVERVIEW_CHECK_IN_LIMIT = 8;

/** Attended (present, late, excused) as a percentage with one decimal, or null with no marks. */
function attendanceRateOf(summary: ReturnType<typeof countMarksByStatusRows>): number | null {
	const attended = summary.present + summary.late + summary.excused;
	return summary.total > 0 ? Math.round((attended / summary.total) * 1000) / 10 : null;
}

/** The Monday on or before a YYYY-MM-DD date. */
function mondayOf(isoDate: string): string {
	const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
	return shiftIsoDate(isoDate, -((weekday + 6) % 7));
}

/** Adds whole days to a YYYY-MM-DD date in UTC. */
function shiftIsoDate(isoDate: string, days: number): string {
	const date = new Date(`${isoDate}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
}

/** Last day of the month that contains a YYYY-MM-DD date. */
function endOfMonth(isoDate: string): string {
	const date = new Date(`${isoDate.slice(0, 7)}-01T00:00:00Z`);
	date.setUTCMonth(date.getUTCMonth() + 1, 0);
	return date.toISOString().slice(0, 10);
}

function daysBetween(fromDate: string, toDate: string): number {
	return Math.round(
		(Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / 86_400_000,
	);
}

/** A period's last day, cut off at today so a running week or month compares like for like. */
function clipToToday(fromDate: string, endDate: string, today: string): string {
	return today >= fromDate && today < endDate ? today : endDate;
}

const REPORT_FOLLOW_UP = { absences: 3, late: 4 } as const;
const REPORT_FOLLOW_UP_LIMIT = 25;

export type AttendanceReportPeriod = 'week' | 'month' | 'year';

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

	private async requireLeadershipRead(userId: string, tenantId: string) {
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
		return membership;
	}

	/**
	 * Leadership dashboard: daily attendance for last week and this week (Monday to Sunday,
	 * the week containing `sessionDate`), how students were checked in, and the latest marks.
	 */
	async getOverview(userId: string, tenantId: string, sessionDate: string) {
		await this.requireLeadershipRead(userId, tenantId);

		const fromDate = shiftIsoDate(mondayOf(sessionDate), -7);
		const toDate = shiftIsoDate(fromDate, 13);
		const [dailyRows, sourceRows, checkIns] = await Promise.all([
			this.attendance.countMarksByDateAndStatus(tenantId, fromDate, toDate),
			this.attendance.countStudentsByEventSource(tenantId, sessionDate),
			this.attendance.listCheckInsForDate(tenantId, sessionDate, OVERVIEW_CHECK_IN_LIMIT),
		]);

		const rowsByDate = new Map<string, typeof dailyRows>();
		for (const row of dailyRows) {
			const list = rowsByDate.get(row.sessionDate) ?? [];
			list.push(row);
			rowsByDate.set(row.sessionDate, list);
		}

		const days = Array.from({ length: 14 }, (_, index) => {
			const date = shiftIsoDate(fromDate, index);
			const summary = countMarksByStatusRows(rowsByDate.get(date) ?? []);
			return { date, summary, attendanceRate: attendanceRateOf(summary) };
		});
		const today = countMarksByStatusRows(rowsByDate.get(sessionDate) ?? []);

		return {
			sessionDate,
			days,
			today: { summary: today, attendanceRate: attendanceRateOf(today) },
			checkInSources: sourceRows,
			checkIns: checkIns.map((row) => ({
				markId: row.markId,
				studentId: row.studentId,
				studentCode: row.studentCode,
				fullName: `${row.firstName} ${row.lastName}`,
				status: row.status,
				markedAt: row.markedAt,
				sectionName: row.sectionName,
				className: row.className,
				guardianName: row.guardianName,
			})),
		};
	}

	/**
	 * Leadership attendance report (Figma "Attendance report"): totals against the previous
	 * period, rate per class, late arrivals per weekday and students over the follow-up rule.
	 */
	async getReport(
		userId: string,
		tenantId: string,
		period: AttendanceReportPeriod,
		date: string,
		today: string,
	) {
		await this.requireLeadershipRead(userId, tenantId);
		const range = await this.reportRange(tenantId, period, date, today);

		const [dailyRows, previousRows, sectionRows, followUps] = await Promise.all([
			this.attendance.countMarksByDateAndStatus(tenantId, range.from, range.to),
			range.previous
				? this.attendance.countMarksByDateAndStatus(
						tenantId,
						range.previous.from,
						range.previous.to,
					)
				: Promise.resolve([]),
			this.attendance.countMarksBySectionAndStatus(tenantId, range.from, range.to),
			this.attendance.listStudentsOverThreshold(
				tenantId,
				range.from,
				range.to,
				REPORT_FOLLOW_UP,
				REPORT_FOLLOW_UP_LIMIT,
			),
		]);

		const summary = countMarksByStatusRows(dailyRows);
		const previousSummary = range.previous ? countMarksByStatusRows(previousRows) : null;

		const lateByWeekday = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({ dayOfWeek, count: 0 }));
		for (const row of dailyRows) {
			if (row.status !== 'late') continue;
			const weekday = new Date(`${row.sessionDate}T00:00:00Z`).getUTCDay() || 7;
			lateByWeekday[weekday - 1]!.count += row.count;
		}

		const sectionGroups = new Map<
			string,
			{ sectionId: string; sectionName: string; className: string | null; rows: typeof sectionRows }
		>();
		for (const row of sectionRows) {
			const group = sectionGroups.get(row.sectionId) ?? {
				sectionId: row.sectionId,
				sectionName: row.sectionName,
				className: row.className,
				rows: [],
			};
			group.rows.push(row);
			sectionGroups.set(row.sectionId, group);
		}
		const byClass = [...sectionGroups.values()]
			.map(({ sectionId, sectionName, className, rows }) => {
				const counts = countMarksByStatusRows(rows);
				return {
					sectionId,
					sectionName,
					className,
					summary: counts,
					attendanceRate: attendanceRateOf(counts),
				};
			})
			.toSorted((a, b) =>
				`${a.className ?? ''} ${a.sectionName}`.localeCompare(
					`${b.className ?? ''} ${b.sectionName}`,
					undefined,
					{ numeric: true },
				),
			);

		return {
			period,
			from: range.from,
			to: range.to,
			previous: range.previous,
			schoolDays: new Set(dailyRows.map((row) => row.sessionDate)).size,
			summary,
			attendanceRate: attendanceRateOf(summary),
			previousSummary,
			previousAttendanceRate: previousSummary ? attendanceRateOf(previousSummary) : null,
			byClass,
			// Weekend columns only when the school actually marked on a weekend.
			lateByWeekday: lateByWeekday.filter((day) => day.dayOfWeek <= 5 || day.count > 0),
			followUpRule: REPORT_FOLLOW_UP,
			followUps: followUps.map((row) => ({
				studentId: row.studentId,
				studentCode: row.studentCode,
				fullName: `${row.firstName} ${row.lastName}`,
				sectionName: row.sectionName,
				className: row.className,
				absences: row.absences,
				late: row.late,
				excused: row.excused,
				guardianName: row.guardianName,
				guardianPhone: row.guardianPhone,
			})),
		};
	}

	private async reportRange(
		tenantId: string,
		period: AttendanceReportPeriod,
		date: string,
		today: string,
	): Promise<{ from: string; to: string; previous: { from: string; to: string } | null }> {
		if (period === 'week') {
			const from = mondayOf(date);
			const to = clipToToday(from, shiftIsoDate(from, 6), today);
			return { from, to, previous: { from: shiftIsoDate(from, -7), to: shiftIsoDate(to, -7) } };
		}
		if (period === 'month') {
			const from = `${date.slice(0, 7)}-01`;
			const to = clipToToday(from, endOfMonth(from), today);
			const previousFrom = `${shiftIsoDate(from, -1).slice(0, 7)}-01`;
			const previousEnd = endOfMonth(previousFrom);
			const previousTo = shiftIsoDate(previousFrom, daysBetween(from, to));
			return {
				from,
				to,
				previous: { from: previousFrom, to: previousTo < previousEnd ? previousTo : previousEnd },
			};
		}
		const year = await this.attendance.findActiveAcademicYear(tenantId);
		const from = year?.startsOn ?? `${date.slice(0, 4)}-01-01`;
		const end = year?.endsOn ?? `${date.slice(0, 4)}-12-31`;
		return { from, to: clipToToday(from, end, today), previous: null };
	}

	async getSchoolDayPulse(userId: string, tenantId: string, sessionDate: string) {
		await this.requireLeadershipRead(userId, tenantId);

		const sessions = await this.attendance.listSessionsForDate(tenantId, sessionDate);
		const sessionIds = sessions.map((session) => session.id);
		const statusRows = await this.attendance.countMarksByStatusForSessions(tenantId, sessionIds);

		const summary = countMarksByStatusRows(statusRows);

		const attendanceRate = attendanceRateOf(summary);

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
