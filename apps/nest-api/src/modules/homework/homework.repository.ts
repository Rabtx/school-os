import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	homeworkAssignments,
	homeworkRecipients,
	homeworkSubmissions,
	memberships,
	sectionSubjects,
	sections,
	subjects,
	userProfiles,
	users,
} from '@/database/schema';
import type { ListHomeworkQuery } from './homework.dto';

@Injectable()
export class HomeworkRepository {
	constructor(private readonly database: DatabaseService) {}

	private buildListQuery(
		tenantId: string,
		filters: ListHomeworkQuery,
		sectionSubjectIds?: string[],
	) {
		const conditions = [eq(homeworkAssignments.tenantId, tenantId)];

		if (filters.sectionSubjectId) {
			conditions.push(eq(homeworkAssignments.sectionSubjectId, filters.sectionSubjectId));
		} else if (sectionSubjectIds) {
			if (sectionSubjectIds.length === 0) {
				return null;
			}
			conditions.push(inArray(homeworkAssignments.sectionSubjectId, sectionSubjectIds));
		}

		if (filters.status) {
			conditions.push(eq(homeworkAssignments.status, filters.status));
		}

		return this.database.db
			.select({
				assignment: homeworkAssignments,
				sectionSubject: sectionSubjects,
				section: sections,
				subject: subjects,
				submittedCount: sql<number>`(
					select count(*)::int from ${homeworkSubmissions}
					where ${homeworkSubmissions.homeworkId} = ${homeworkAssignments.id}
						and ${homeworkSubmissions.status} in ('submitted', 'late', 'graded')
				)`,
				teacherName: sql<string | null>`(
					select coalesce(nullif(${userProfiles.displayName}, ''), ${users.username})
					from ${memberships}
					join ${users} on ${users.id} = ${memberships.userId}
					left join ${userProfiles} on ${userProfiles.userId} = ${users.id}
					where ${memberships.id} = ${homeworkAssignments.createdByMembershipId}
				)`,
			})
			.from(homeworkAssignments)
			.innerJoin(sectionSubjects, eq(homeworkAssignments.sectionSubjectId, sectionSubjects.id))
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(and(...conditions, isNull(sections.deletedAt), isNull(subjects.deletedAt)))
			.orderBy(desc(homeworkAssignments.dueAt), desc(homeworkAssignments.createdAt));
	}

	async list(tenantId: string, filters: ListHomeworkQuery) {
		const query = this.buildListQuery(tenantId, filters);
		if (!query) return [];
		return query;
	}

	async listForSectionSubjects(
		tenantId: string,
		sectionSubjectIds: string[],
		filters: ListHomeworkQuery,
	) {
		const query = this.buildListQuery(tenantId, filters, sectionSubjectIds);
		if (!query) return [];
		return query;
	}

	async findById(tenantId: string, homeworkId: string) {
		const [row] = await this.database.db
			.select({
				assignment: homeworkAssignments,
				sectionSubject: sectionSubjects,
				section: sections,
				subject: subjects,
			})
			.from(homeworkAssignments)
			.innerJoin(sectionSubjects, eq(homeworkAssignments.sectionSubjectId, sectionSubjects.id))
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(
				and(
					eq(homeworkAssignments.tenantId, tenantId),
					eq(homeworkAssignments.id, homeworkId),
					isNull(sections.deletedAt),
					isNull(subjects.deletedAt),
				),
			)
			.limit(1);
		return row ?? null;
	}

	async create(input: typeof homeworkAssignments.$inferInsert) {
		const [row] = await this.database.db.insert(homeworkAssignments).values(input).returning();
		return row;
	}

	async update(
		tenantId: string,
		homeworkId: string,
		input: Partial<typeof homeworkAssignments.$inferInsert>,
	) {
		const [row] = await this.database.db
			.update(homeworkAssignments)
			.set({ ...input, updatedAt: new Date() })
			.where(
				and(eq(homeworkAssignments.tenantId, tenantId), eq(homeworkAssignments.id, homeworkId)),
			)
			.returning();
		return row ?? null;
	}

	async listRecipientStudentIds(tenantId: string, homeworkId: string) {
		const rows = await this.database.db
			.select({ studentId: homeworkRecipients.studentId })
			.from(homeworkRecipients)
			.where(
				and(
					eq(homeworkRecipients.tenantId, tenantId),
					eq(homeworkRecipients.homeworkId, homeworkId),
				),
			);
		return rows.map((row) => row.studentId);
	}

	async countRecipients(tenantId: string, homeworkId: string) {
		const rows = await this.listRecipientStudentIds(tenantId, homeworkId);
		return rows.length;
	}

	async syncRecipients(tenantId: string, homeworkId: string, studentIds: string[]) {
		await this.database.db.transaction(async (transaction) => {
			await transaction
				.delete(homeworkRecipients)
				.where(
					and(
						eq(homeworkRecipients.tenantId, tenantId),
						eq(homeworkRecipients.homeworkId, homeworkId),
					),
				);

			if (studentIds.length === 0) return;

			await transaction.insert(homeworkRecipients).values(
				studentIds.map((studentId) => ({
					tenantId,
					homeworkId,
					studentId,
				})),
			);
		});
	}
}
