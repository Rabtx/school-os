import { Injectable } from '@nestjs/common';
import { and, between, eq, gte, inArray, isNull, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	assessments,
	attendanceMarks,
	attendanceSessions,
	guardians,
	sectionSubjects,
	studentGuardians,
	subjects,
} from '@/database/schema';

/** What the principal sees beside a leave request (Figma `126:40250`). */
@Injectable()
export class LeaveContextRepository {
	constructor(private readonly database: DatabaseService) {}

	/** True when the member is a guardian linked to this student. */
	async isGuardianOf(tenantId: string, membershipId: string, studentId: string) {
		const [row] = await this.database.db
			.select({ id: studentGuardians.id })
			.from(studentGuardians)
			.innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
			.where(
				and(
					eq(studentGuardians.tenantId, tenantId),
					eq(studentGuardians.studentId, studentId),
					eq(guardians.membershipId, membershipId),
					isNull(guardians.deletedAt),
				),
			)
			.limit(1);
		return Boolean(row);
	}

	/** Tests and exams for the class on these days, e.g. "English test 2 (Tue)". */
	async listTestsInRange(tenantId: string, sectionId: string, fromDate: string, toDate: string) {
		return this.database.db
			.select({ title: assessments.title, subject: subjects.name, on: assessments.assessedOn })
			.from(assessments)
			.innerJoin(sectionSubjects, eq(sectionSubjects.id, assessments.sectionSubjectId))
			.innerJoin(subjects, eq(subjects.id, sectionSubjects.subjectId))
			.where(
				and(
					eq(assessments.tenantId, tenantId),
					eq(sectionSubjects.sectionId, sectionId),
					inArray(assessments.status, ['draft', 'published']),
					between(assessments.assessedOn, fromDate, toDate),
				),
			)
			.orderBy(assessments.assessedOn);
	}

	/** Attended and marked days since a date, for "Attendance 96% this term". */
	async attendanceSince(tenantId: string, studentId: string, sinceDate: string) {
		const [row] = await this.database.db
			.select({
				marked: sql<number>`count(*) filter (where ${attendanceMarks.status} <> 'unknown')::int`,
				attended: sql<number>`count(*) filter (where ${attendanceMarks.status} in ('present', 'late', 'excused', 'left_early'))::int`,
				excused: sql<number>`count(*) filter (where ${attendanceMarks.status} = 'excused')::int`,
			})
			.from(attendanceMarks)
			.innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceMarks.sessionId))
			.where(
				and(
					eq(attendanceMarks.tenantId, tenantId),
					eq(attendanceMarks.studentId, studentId),
					gte(attendanceSessions.sessionDate, sinceDate),
				),
			);
		return { marked: row?.marked ?? 0, attended: row?.attended ?? 0, excused: row?.excused ?? 0 };
	}
}
