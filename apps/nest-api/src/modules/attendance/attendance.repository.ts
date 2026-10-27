import { Injectable } from '@nestjs/common';
import { and, between, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	type AttendanceMarkRecord,
	type AttendanceSessionRecord,
	academicYears,
	attendanceEvents,
	attendanceMarks,
	attendanceSessions,
	auditLogs,
	classes,
	guardians,
	outboxEvents,
	sections,
	studentGuardians,
	students,
} from '@/database/schema';

type MarkInput = {
	studentId: string;
	status: AttendanceMarkRecord['status'];
};

@Injectable()
export class AttendanceRepository {
	constructor(private readonly database: DatabaseService) {}

	async findSessionBySectionAndDate(tenantId: string, sectionId: string, sessionDate: string) {
		const [session] = await this.database.db
			.select()
			.from(attendanceSessions)
			.where(
				and(
					eq(attendanceSessions.tenantId, tenantId),
					eq(attendanceSessions.sectionId, sectionId),
					eq(attendanceSessions.sessionDate, sessionDate),
				),
			)
			.limit(1);
		return session ?? null;
	}

	async findSessionById(tenantId: string, sessionId: string) {
		const [session] = await this.database.db
			.select()
			.from(attendanceSessions)
			.where(and(eq(attendanceSessions.id, sessionId), eq(attendanceSessions.tenantId, tenantId)))
			.limit(1);
		return session ?? null;
	}

	async createSession(input: typeof attendanceSessions.$inferInsert) {
		const [session] = await this.database.db.insert(attendanceSessions).values(input).returning();
		return session;
	}

	async listMarksForSession(tenantId: string, sessionId: string) {
		return this.database.db
			.select()
			.from(attendanceMarks)
			.where(and(eq(attendanceMarks.tenantId, tenantId), eq(attendanceMarks.sessionId, sessionId)))
			.orderBy(attendanceMarks.studentId);
	}

	async listMarksForStudent(tenantId: string, studentId: string, limit = 50) {
		return this.database.db
			.select({
				mark: attendanceMarks,
				session: attendanceSessions,
			})
			.from(attendanceMarks)
			.innerJoin(attendanceSessions, eq(attendanceMarks.sessionId, attendanceSessions.id))
			.where(and(eq(attendanceMarks.tenantId, tenantId), eq(attendanceMarks.studentId, studentId)))
			.orderBy(desc(attendanceSessions.sessionDate))
			.limit(limit);
	}

	async markStudents(input: {
		tenantId: string;
		session: AttendanceSessionRecord;
		marks: MarkInput[];
		markedByMembershipId: string;
	}) {
		const now = new Date();

		return this.database.db.transaction(async (transaction) => {
			const studentIds = input.marks.map((m) => m.studentId);

			const existingMarks = await transaction
				.select()
				.from(attendanceMarks)
				.where(
					and(
						eq(attendanceMarks.sessionId, input.session.id),
						inArray(attendanceMarks.studentId, studentIds),
					),
				);

			const existingByStudent = new Map(existingMarks.map((m) => [m.studentId, m]));

			const toInsert: Array<typeof attendanceMarks.$inferInsert> = [];
			const toUpdate: Array<{ id: string; status: AttendanceMarkRecord['status'] }> = [];

			for (const markInput of input.marks) {
				const existing = existingByStudent.get(markInput.studentId);
				if (existing) {
					toUpdate.push({ id: existing.id, status: markInput.status });
				} else {
					toInsert.push({
						tenantId: input.tenantId,
						sessionId: input.session.id,
						studentId: markInput.studentId,
						status: markInput.status,
						markedAt: now,
						markedByMembershipId: input.markedByMembershipId,
					});
				}
			}

			const results: AttendanceMarkRecord[] = [];

			if (toInsert.length > 0) {
				const created = await transaction.insert(attendanceMarks).values(toInsert).returning();
				results.push(...created);
			}

			for (const update of toUpdate) {
				// oxlint-disable-next-line no-await-in-loop -- updates share one transaction connection
				const [updated] = await transaction
					.update(attendanceMarks)
					.set({
						status: update.status,
						markedAt: now,
						markedByMembershipId: input.markedByMembershipId,
						updatedAt: now,
					})
					.where(eq(attendanceMarks.id, update.id))
					.returning();
				if (updated) results.push(updated);
			}

			const eventValues = input.marks.map((markInput) => {
				const existing = existingByStudent.get(markInput.studentId);
				const mark = results.find((r) => r.studentId === markInput.studentId);
				return {
					tenantId: input.tenantId,
					sessionId: input.session.id,
					studentId: markInput.studentId,
					eventType: 'manual_marked' as const,
					source: 'manual' as const,
					sourceEventId: `manual:${mark?.id ?? ''}:${now.getTime()}`,
					payload: {
						status: markInput.status,
						previousStatus: existing?.status ?? null,
						markedByMembershipId: input.markedByMembershipId,
					},
				};
			});

			if (eventValues.length > 0) {
				await transaction.insert(attendanceEvents).values(eventValues);
			}

			const auditValues = input.marks
				.map((markInput) => {
					const existing = existingByStudent.get(markInput.studentId);
					const mark = results.find((r) => r.studentId === markInput.studentId);
					if (!mark?.id) return null;
					return {
						tenantId: input.tenantId,
						actorMembershipId: input.markedByMembershipId,
						action: 'attendance.marked',
						resourceType: 'attendance_mark',
						resourceId: mark.id,
						metadata: {
							sessionId: input.session.id,
							studentId: markInput.studentId,
							status: markInput.status,
							previousStatus: existing?.status ?? null,
						},
					};
				})
				.filter((v): v is NonNullable<typeof v> => v !== null);

			if (auditValues.length > 0) {
				await transaction.insert(auditLogs).values(auditValues);
			}

			const outboxValues = input.marks
				.map((markInput) => {
					const mark = results.find((r) => r.studentId === markInput.studentId);
					if (!mark?.id) return null;
					return {
						tenantId: input.tenantId,
						eventType: 'attendance.manual_marked.v1',
						aggregateType: 'attendance_mark',
						aggregateId: mark.id,
						payload: {
							tenantId: input.tenantId,
							sessionId: input.session.id,
							sectionId: input.session.sectionId,
							campusId: input.session.campusId,
							studentId: markInput.studentId,
							status: markInput.status,
							sessionDate: input.session.sessionDate,
							markedAt: now.toISOString(),
						},
						status: 'pending' as const,
					};
				})
				.filter((v): v is NonNullable<typeof v> => v !== null);

			if (outboxValues.length > 0) {
				await transaction.insert(outboxEvents).values(outboxValues);
			}

			return results;
		});
	}

	async countOutboxEventsForMarks(tenantId: string, markIds: string[]) {
		if (markIds.length === 0) return 0;
		const rows = await this.database.db
			.select({ id: outboxEvents.id })
			.from(outboxEvents)
			.where(
				and(
					eq(outboxEvents.tenantId, tenantId),
					inArray(outboxEvents.aggregateId, markIds),
					eq(outboxEvents.aggregateType, 'attendance_mark'),
				),
			);
		return rows.length;
	}

	async listSessionsForDate(tenantId: string, sessionDate: string) {
		return this.database.db
			.select()
			.from(attendanceSessions)
			.where(
				and(
					eq(attendanceSessions.tenantId, tenantId),
					eq(attendanceSessions.sessionDate, sessionDate),
				),
			);
	}

	async countMarksByStatusForSessions(tenantId: string, sessionIds: string[]) {
		if (sessionIds.length === 0) {
			return [] as Array<{ status: AttendanceMarkRecord['status']; count: number }>;
		}

		const rows = await this.database.db
			.select({
				status: attendanceMarks.status,
				count: sql<number>`count(*)::int`,
			})
			.from(attendanceMarks)
			.where(
				and(eq(attendanceMarks.tenantId, tenantId), inArray(attendanceMarks.sessionId, sessionIds)),
			)
			.groupBy(attendanceMarks.status);

		return rows;
	}

	/** Mark counts per session date and status, for the dashboard attendance chart. */
	async countMarksByDateAndStatus(tenantId: string, fromDate: string, toDate: string) {
		return this.database.db
			.select({
				sessionDate: attendanceSessions.sessionDate,
				status: attendanceMarks.status,
				count: sql<number>`count(*)::int`,
			})
			.from(attendanceMarks)
			.innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceMarks.sessionId))
			.where(
				and(
					eq(attendanceMarks.tenantId, tenantId),
					between(attendanceSessions.sessionDate, fromDate, toDate),
				),
			)
			.groupBy(attendanceSessions.sessionDate, attendanceMarks.status);
	}

	/** Students with a recorded event on the date, grouped by event source (roll call, gate scan). */
	async countStudentsByEventSource(tenantId: string, sessionDate: string) {
		return this.database.db
			.select({
				source: attendanceEvents.source,
				count: sql<number>`count(distinct ${attendanceEvents.studentId})::int`,
			})
			.from(attendanceEvents)
			.innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceEvents.sessionId))
			.where(
				and(
					eq(attendanceEvents.tenantId, tenantId),
					eq(attendanceSessions.sessionDate, sessionDate),
				),
			)
			.groupBy(attendanceEvents.source);
	}

	/** Latest marks on a date with student, class and primary guardian, newest first. */
	async listCheckInsForDate(tenantId: string, sessionDate: string, limit: number) {
		const primaryGuardian = sql<string | null>`(
			select ${guardians.firstName} || ' ' || ${guardians.lastName}
			from ${studentGuardians}
			join ${guardians} on ${guardians.id} = ${studentGuardians.guardianId}
			where ${studentGuardians.studentId} = ${attendanceMarks.studentId}
				and ${studentGuardians.tenantId} = ${tenantId}
			order by ${studentGuardians.isPrimary} desc
			limit 1
		)`;
		return this.database.db
			.select({
				markId: attendanceMarks.id,
				studentId: students.id,
				studentCode: students.studentCode,
				firstName: students.firstName,
				lastName: students.lastName,
				status: attendanceMarks.status,
				markedAt: attendanceMarks.markedAt,
				sectionName: sections.name,
				className: classes.name,
				guardianName: primaryGuardian,
			})
			.from(attendanceMarks)
			.innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceMarks.sessionId))
			.innerJoin(students, eq(students.id, attendanceMarks.studentId))
			.leftJoin(sections, eq(sections.id, attendanceSessions.sectionId))
			.leftJoin(classes, eq(classes.id, sections.classId))
			.where(
				and(
					eq(attendanceMarks.tenantId, tenantId),
					eq(attendanceSessions.sessionDate, sessionDate),
				),
			)
			.orderBy(sql`${attendanceMarks.markedAt} desc nulls last`)
			.limit(limit);
	}
	/** Mark counts per section and status over a date range, for the attendance report. */
	async countMarksBySectionAndStatus(tenantId: string, fromDate: string, toDate: string) {
		return this.database.db
			.select({
				sectionId: sections.id,
				sectionName: sections.name,
				className: classes.name,
				status: attendanceMarks.status,
				count: sql<number>`count(*)::int`,
			})
			.from(attendanceMarks)
			.innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceMarks.sessionId))
			.innerJoin(sections, eq(sections.id, attendanceSessions.sectionId))
			.leftJoin(classes, eq(classes.id, sections.classId))
			.where(
				and(
					eq(attendanceMarks.tenantId, tenantId),
					between(attendanceSessions.sessionDate, fromDate, toDate),
				),
			)
			.groupBy(sections.id, sections.name, classes.name, attendanceMarks.status);
	}

	/**
	 * Students at or over an absence or late threshold in the range, worst first, with their
	 * latest class and primary guardian.
	 */
	async listStudentsOverThreshold(
		tenantId: string,
		fromDate: string,
		toDate: string,
		thresholds: { absences: number; late: number },
		limit: number,
	) {
		const absences = sql<number>`count(*) filter (where ${attendanceMarks.status} = 'absent')::int`;
		const late = sql<number>`count(*) filter (where ${attendanceMarks.status} = 'late')::int`;
		const excused = sql<number>`count(*) filter (where ${attendanceMarks.status} = 'excused')::int`;
		const sectionName = sql<
			string | null
		>`(array_agg(${sections.name} order by ${attendanceSessions.sessionDate} desc))[1]`;
		const className = sql<
			string | null
		>`(array_agg(${classes.name} order by ${attendanceSessions.sessionDate} desc))[1]`;
		const guardian = (column: 'name' | 'phone') => sql<string | null>`(
			select ${column === 'name' ? sql`${guardians.firstName} || ' ' || ${guardians.lastName}` : guardians.phone}
			from ${studentGuardians}
			join ${guardians} on ${guardians.id} = ${studentGuardians.guardianId}
			where ${studentGuardians.studentId} = ${students.id}
				and ${studentGuardians.tenantId} = ${tenantId}
			order by ${studentGuardians.isPrimary} desc
			limit 1
		)`;
		return this.database.db
			.select({
				studentId: students.id,
				studentCode: students.studentCode,
				firstName: students.firstName,
				lastName: students.lastName,
				absences,
				late,
				excused,
				sectionName,
				className,
				guardianName: guardian('name'),
				guardianPhone: guardian('phone'),
			})
			.from(attendanceMarks)
			.innerJoin(attendanceSessions, eq(attendanceSessions.id, attendanceMarks.sessionId))
			.innerJoin(students, eq(students.id, attendanceMarks.studentId))
			.leftJoin(sections, eq(sections.id, attendanceSessions.sectionId))
			.leftJoin(classes, eq(classes.id, sections.classId))
			.where(
				and(
					eq(attendanceMarks.tenantId, tenantId),
					between(attendanceSessions.sessionDate, fromDate, toDate),
					isNull(students.deletedAt),
				),
			)
			.groupBy(students.id)
			.having(sql`${absences} >= ${thresholds.absences} or ${late} >= ${thresholds.late}`)
			.orderBy(sql`${absences} desc`, sql`${late} desc`, students.lastName)
			.limit(limit);
	}

	/** The tenant's active academic year, if one is set. */
	async findActiveAcademicYear(tenantId: string) {
		const [row] = await this.database.db
			.select({ startsOn: academicYears.startsOn, endsOn: academicYears.endsOn })
			.from(academicYears)
			.where(
				and(
					eq(academicYears.tenantId, tenantId),
					eq(academicYears.status, 'active'),
					isNull(academicYears.deletedAt),
				),
			)
			.limit(1);
		return row ?? null;
	}
}
