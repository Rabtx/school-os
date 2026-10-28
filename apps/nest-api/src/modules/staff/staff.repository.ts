import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	attendanceMarks,
	attendanceSessions,
	classes,
	enrollments,
	homeworkAssignments,
	homeworkSubmissions,
	memberships,
	sectionSubjects,
	sections,
	staffProfiles,
	students,
	subjects,
	users,
} from '@/database/schema';

const teacherRoles = ['teacher', 'principal', 'admin', 'owner'] as const;

@Injectable()
export class StaffRepository {
	constructor(private readonly database: DatabaseService) {}

	async listTeachers(tenantId: string) {
		return this.database.db
			.select({
				membership: memberships,
				user: {
					id: users.id,
					email: users.email,
					username: users.username,
				},
				profile: staffProfiles,
			})
			.from(memberships)
			.innerJoin(users, eq(memberships.userId, users.id))
			.leftJoin(staffProfiles, eq(staffProfiles.membershipId, memberships.id))
			.where(
				and(
					eq(memberships.tenantId, tenantId),
					eq(memberships.status, 'active'),
					inArray(memberships.role, [...teacherRoles]),
					isNull(staffProfiles.deletedAt),
				),
			)
			.orderBy(asc(users.email));
	}

	async findTeacherByMembershipId(tenantId: string, membershipId: string) {
		const [row] = await this.database.db
			.select({
				membership: memberships,
				user: {
					id: users.id,
					email: users.email,
					username: users.username,
				},
				profile: staffProfiles,
			})
			.from(memberships)
			.innerJoin(users, eq(memberships.userId, users.id))
			.leftJoin(staffProfiles, eq(staffProfiles.membershipId, memberships.id))
			.where(
				and(
					eq(memberships.tenantId, tenantId),
					eq(memberships.id, membershipId),
					eq(memberships.status, 'active'),
					inArray(memberships.role, [...teacherRoles]),
				),
			)
			.limit(1);
		return row ?? null;
	}

	async findProfileByMembershipId(tenantId: string, membershipId: string) {
		const [row] = await this.database.db
			.select()
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.tenantId, tenantId),
					eq(staffProfiles.membershipId, membershipId),
					isNull(staffProfiles.deletedAt),
				),
			)
			.limit(1);
		return row ?? null;
	}

	async findProfileById(tenantId: string, profileId: string) {
		const [row] = await this.database.db
			.select()
			.from(staffProfiles)
			.where(
				and(
					eq(staffProfiles.id, profileId),
					eq(staffProfiles.tenantId, tenantId),
					isNull(staffProfiles.deletedAt),
				),
			)
			.limit(1);
		return row ?? null;
	}

	async upsertProfile(input: typeof staffProfiles.$inferInsert) {
		const existing = await this.findProfileByMembershipId(input.tenantId, input.membershipId);
		if (existing) {
			const [profile] = await this.database.db
				.update(staffProfiles)
				.set({ ...input, updatedAt: new Date() })
				.where(eq(staffProfiles.id, existing.id))
				.returning();
			return profile;
		}
		const [profile] = await this.database.db.insert(staffProfiles).values(input).returning();
		return profile;
	}

	async listHomeroomSections(tenantId: string, membershipId: string) {
		return this.database.db
			.select()
			.from(sections)
			.where(
				and(
					eq(sections.tenantId, tenantId),
					eq(sections.homeroomTeacherMembershipId, membershipId),
					isNull(sections.deletedAt),
				),
			);
	}

	async listSubjectAssignments(tenantId: string, membershipId: string) {
		return this.database.db
			.select({
				assignment: sectionSubjects,
				section: sections,
				subject: subjects,
			})
			.from(sectionSubjects)
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(
				and(
					eq(sectionSubjects.tenantId, tenantId),
					eq(sectionSubjects.teacherMembershipId, membershipId),
					isNull(sections.deletedAt),
					isNull(subjects.deletedAt),
				),
			);
	}

	async listAllSectionSubjects(tenantId: string, campusId?: string) {
		const conditions = [
			eq(sectionSubjects.tenantId, tenantId),
			isNull(sections.deletedAt),
			isNull(subjects.deletedAt),
		];
		if (campusId) {
			conditions.push(eq(sections.campusId, campusId));
		}

		return this.database.db
			.select({
				assignment: sectionSubjects,
				section: sections,
				subject: subjects,
			})
			.from(sectionSubjects)
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(and(...conditions))
			.orderBy(asc(sections.name), asc(subjects.name));
	}

	async listSubjects(tenantId: string) {
		return this.database.db
			.select()
			.from(subjects)
			.where(and(eq(subjects.tenantId, tenantId), isNull(subjects.deletedAt)))
			.orderBy(asc(subjects.name));
	}

	async createSubject(input: typeof subjects.$inferInsert) {
		const [subject] = await this.database.db.insert(subjects).values(input).returning();
		return subject;
	}

	async assignSectionSubject(input: typeof sectionSubjects.$inferInsert) {
		const [row] = await this.database.db.insert(sectionSubjects).values(input).returning();
		return row;
	}

	async findSectionSubjectById(tenantId: string, sectionSubjectId: string) {
		const [row] = await this.database.db
			.select({
				assignment: sectionSubjects,
				section: sections,
				subject: subjects,
			})
			.from(sectionSubjects)
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(
				and(
					eq(sectionSubjects.tenantId, tenantId),
					eq(sectionSubjects.id, sectionSubjectId),
					isNull(sections.deletedAt),
					isNull(subjects.deletedAt),
				),
			)
			.limit(1);
		return row ?? null;
	}

	async teacherCanAccessSectionSubject(
		tenantId: string,
		membershipId: string,
		sectionSubjectId: string,
	) {
		const row = await this.findSectionSubjectById(tenantId, sectionSubjectId);
		if (!row) return false;
		return row.assignment.teacherMembershipId === membershipId;
	}

	async findMembership(tenantId: string, membershipId: string) {
		const [row] = await this.database.db
			.select()
			.from(memberships)
			.where(
				and(
					eq(memberships.id, membershipId),
					eq(memberships.tenantId, tenantId),
					eq(memberships.status, 'active'),
				),
			)
			.limit(1);
		return row ?? null;
	}

	async findTeacherMemberships(tenantId: string, membershipIds: string[]) {
		if (membershipIds.length === 0) return [];
		return this.database.db
			.select()
			.from(memberships)
			.where(
				and(
					eq(memberships.tenantId, tenantId),
					inArray(memberships.id, membershipIds),
					or(
						eq(memberships.role, 'teacher'),
						eq(memberships.role, 'principal'),
						eq(memberships.role, 'admin'),
					),
				),
			);
	}

	async teacherHasHomeroomAccess(tenantId: string, membershipId: string, sectionId: string) {
		const [homeroom] = await this.database.db
			.select({ id: sections.id })
			.from(sections)
			.where(
				and(
					eq(sections.tenantId, tenantId),
					eq(sections.id, sectionId),
					eq(sections.homeroomTeacherMembershipId, membershipId),
					isNull(sections.deletedAt),
				),
			)
			.limit(1);
		return Boolean(homeroom);
	}

	async teacherHasSectionAccess(tenantId: string, membershipId: string, sectionId: string) {
		if (await this.teacherHasHomeroomAccess(tenantId, membershipId, sectionId)) {
			return true;
		}

		const [assignment] = await this.database.db
			.select({ id: sectionSubjects.id })
			.from(sectionSubjects)
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.where(
				and(
					eq(sectionSubjects.tenantId, tenantId),
					eq(sectionSubjects.sectionId, sectionId),
					eq(sectionSubjects.teacherMembershipId, membershipId),
					isNull(sections.deletedAt),
				),
			)
			.limit(1);
		return Boolean(assignment);
	}

	async listTeacherAssignedSectionIds(tenantId: string, membershipId: string) {
		const [homeroomSections, subjectAssignments] = await Promise.all([
			this.listHomeroomSections(tenantId, membershipId),
			this.listSubjectAssignments(tenantId, membershipId),
		]);
		return [
			...new Set([
				...homeroomSections.map((section) => section.id),
				...subjectAssignments.map((assignment) => assignment.section.id),
			]),
		];
	}

	async teacherCanAccessStudent(tenantId: string, membershipId: string, studentId: string) {
		const sectionIds = await this.listTeacherAssignedSectionIds(tenantId, membershipId);
		if (sectionIds.length === 0) return false;

		const [row] = await this.database.db
			.select({ id: enrollments.id })
			.from(enrollments)
			.where(
				and(
					eq(enrollments.tenantId, tenantId),
					eq(enrollments.studentId, studentId),
					eq(enrollments.status, 'active'),
					isNull(enrollments.deletedAt),
					inArray(enrollments.sectionId, sectionIds),
				),
			)
			.limit(1);
		return Boolean(row);
	}

	async findSectionById(tenantId: string, sectionId: string) {
		const [section] = await this.database.db
			.select()
			.from(sections)
			.where(
				and(
					eq(sections.tenantId, tenantId),
					eq(sections.id, sectionId),
					isNull(sections.deletedAt),
				),
			)
			.limit(1);
		return section ?? null;
	}

	async listSectionRoster(tenantId: string, sectionId: string) {
		return this.database.db
			.select({
				enrollment: enrollments,
				student: students,
			})
			.from(enrollments)
			.innerJoin(students, eq(enrollments.studentId, students.id))
			.where(
				and(
					eq(enrollments.tenantId, tenantId),
					eq(enrollments.sectionId, sectionId),
					eq(enrollments.status, 'active'),
					isNull(enrollments.deletedAt),
					isNull(students.deletedAt),
				),
			)
			.orderBy(asc(students.lastName), asc(students.firstName));
	}

	async countActiveEnrollmentsBySections(tenantId: string, sectionIds: string[]) {
		if (sectionIds.length === 0) return new Map<string, number>();

		const rows = await this.database.db
			.select({
				sectionId: enrollments.sectionId,
				count: sql<number>`count(*)::int`,
			})
			.from(enrollments)
			.where(
				and(
					eq(enrollments.tenantId, tenantId),
					inArray(enrollments.sectionId, sectionIds),
					eq(enrollments.status, 'active'),
					isNull(enrollments.deletedAt),
				),
			)
			.groupBy(enrollments.sectionId);

		return new Map(rows.map((row) => [row.sectionId, row.count]));
	}

	async findSessionsBySectionsAndDate(tenantId: string, sectionIds: string[], sessionDate: string) {
		if (sectionIds.length === 0) return [];

		return this.database.db
			.select()
			.from(attendanceSessions)
			.where(
				and(
					eq(attendanceSessions.tenantId, tenantId),
					inArray(attendanceSessions.sectionId, sectionIds),
					eq(attendanceSessions.sessionDate, sessionDate),
				),
			);
	}

	async listMarksForSessions(tenantId: string, sessionIds: string[]) {
		if (sessionIds.length === 0) return [];

		return this.database.db
			.select()
			.from(attendanceMarks)
			.where(
				and(eq(attendanceMarks.tenantId, tenantId), inArray(attendanceMarks.sessionId, sessionIds)),
			);
	}

	async listHomeroomAttendanceHistory(
		tenantId: string,
		sectionIds: string[],
		fromDate: string,
		toDate: string,
	) {
		if (sectionIds.length === 0) return [];

		return this.database.db
			.select({
				studentId: attendanceMarks.studentId,
				status: attendanceMarks.status,
				sessionDate: attendanceSessions.sessionDate,
				sectionId: attendanceSessions.sectionId,
				sectionName: sections.name,
				className: classes.name,
				firstName: students.firstName,
				lastName: students.lastName,
			})
			.from(attendanceMarks)
			.innerJoin(attendanceSessions, eq(attendanceMarks.sessionId, attendanceSessions.id))
			.innerJoin(students, eq(attendanceMarks.studentId, students.id))
			.innerJoin(sections, eq(attendanceSessions.sectionId, sections.id))
			.innerJoin(classes, eq(sections.classId, classes.id))
			.where(
				and(
					eq(attendanceMarks.tenantId, tenantId),
					inArray(attendanceSessions.sectionId, sectionIds),
					gte(attendanceSessions.sessionDate, fromDate),
					lte(attendanceSessions.sessionDate, toDate),
					isNull(students.deletedAt),
				),
			)
			.orderBy(desc(attendanceSessions.sessionDate));
	}

	/** Submissions handed in (on time or late) and not graded yet, across these subject classes. */
	async countHomeworkSubmissionsToReview(
		tenantId: string,
		sectionSubjectIds: string[],
	): Promise<number> {
		if (sectionSubjectIds.length === 0) return 0;
		const [row] = await this.database.db
			.select({ count: sql<number>`count(*)::int` })
			.from(homeworkSubmissions)
			.innerJoin(homeworkAssignments, eq(homeworkAssignments.id, homeworkSubmissions.homeworkId))
			.where(
				and(
					eq(homeworkAssignments.tenantId, tenantId),
					inArray(homeworkAssignments.sectionSubjectId, sectionSubjectIds),
					inArray(homeworkSubmissions.status, ['submitted', 'late']),
				),
			);
		return row?.count ?? 0;
	}

	/** Roll-call mark counts per section, day and status over a date range. */
	async countSectionMarksByDay(
		tenantId: string,
		sectionIds: string[],
		fromDate: string,
		toDate: string,
	) {
		if (sectionIds.length === 0) return [];
		return this.database.db
			.select({
				sectionId: attendanceSessions.sectionId,
				sessionDate: attendanceSessions.sessionDate,
				status: attendanceMarks.status,
				count: sql<number>`count(*)::int`,
			})
			.from(attendanceMarks)
			.innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceMarks.sessionId))
			.where(
				and(
					eq(attendanceMarks.tenantId, tenantId),
					inArray(attendanceSessions.sectionId, sectionIds),
					gte(attendanceSessions.sessionDate, fromDate),
					lte(attendanceSessions.sessionDate, toDate),
				),
			)
			.groupBy(
				attendanceSessions.sectionId,
				attendanceSessions.sessionDate,
				attendanceMarks.status,
			);
	}

	async countHomeworkForSectionSubjects(
		tenantId: string,
		sectionSubjectIds: string[],
		filters: {
			status?: (typeof homeworkAssignments.$inferSelect)['status'];
			dueOnDate?: string;
		},
	): Promise<number> {
		if (sectionSubjectIds.length === 0) return 0;

		const conditions = [
			eq(homeworkAssignments.tenantId, tenantId),
			inArray(homeworkAssignments.sectionSubjectId, sectionSubjectIds),
		];

		if (filters.status) {
			conditions.push(eq(homeworkAssignments.status, filters.status));
		}

		if (filters.dueOnDate) {
			conditions.push(
				sql`${homeworkAssignments.dueAt} IS NOT NULL AND ${homeworkAssignments.dueAt}::date = ${filters.dueOnDate}::date`,
			);
		}

		const [row] = await this.database.db
			.select({ count: sql<number>`count(*)::int` })
			.from(homeworkAssignments)
			.where(and(...conditions));

		return row?.count ?? 0;
	}
}
