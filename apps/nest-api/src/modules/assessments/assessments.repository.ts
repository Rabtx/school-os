import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	assessmentRecipients,
	assessmentResults,
	assessments,
	sectionSubjects,
	sections,
	students,
	subjects,
} from '@/database/schema';
import type { ListAssessmentsQuery, PlannerAssessmentsQuery } from './assessments.dto';

@Injectable()
export class AssessmentsRepository {
	constructor(private readonly database: DatabaseService) {}

	private buildListQuery(
		tenantId: string,
		filters: ListAssessmentsQuery,
		sectionSubjectIds?: string[],
	) {
		const conditions = [eq(assessments.tenantId, tenantId)];

		if (filters.sectionSubjectId) {
			conditions.push(eq(assessments.sectionSubjectId, filters.sectionSubjectId));
		} else if (sectionSubjectIds) {
			if (sectionSubjectIds.length === 0) {
				return null;
			}
			conditions.push(inArray(assessments.sectionSubjectId, sectionSubjectIds));
		}

		if (filters.status) {
			conditions.push(eq(assessments.status, filters.status));
		}

		return this.database.db
			.select({
				assessment: assessments,
				sectionSubject: sectionSubjects,
				section: sections,
				subject: subjects,
			})
			.from(assessments)
			.innerJoin(sectionSubjects, eq(assessments.sectionSubjectId, sectionSubjects.id))
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(and(...conditions, isNull(sections.deletedAt), isNull(subjects.deletedAt)))
			.orderBy(desc(assessments.assessedOn), desc(assessments.createdAt));
	}

	async list(tenantId: string, filters: ListAssessmentsQuery) {
		const query = this.buildListQuery(tenantId, filters);
		if (!query) return [];
		return query;
	}

	async listForSectionSubjects(
		tenantId: string,
		sectionSubjectIds: string[],
		filters: ListAssessmentsQuery,
	) {
		const query = this.buildListQuery(tenantId, filters, sectionSubjectIds);
		if (!query) return [];
		return query;
	}

	async listForPlanner(
		tenantId: string,
		filters: PlannerAssessmentsQuery,
		sectionSubjectIds?: string[],
	) {
		const conditions = [
			eq(assessments.tenantId, tenantId),
			gte(assessments.assessedOn, filters.from),
			lte(assessments.assessedOn, filters.to),
		];

		if (filters.sectionSubjectId) {
			conditions.push(eq(assessments.sectionSubjectId, filters.sectionSubjectId));
		} else if (sectionSubjectIds) {
			if (sectionSubjectIds.length === 0) return [];
			conditions.push(inArray(assessments.sectionSubjectId, sectionSubjectIds));
		}

		return this.database.db
			.select({
				assessment: assessments,
				sectionSubject: sectionSubjects,
				section: sections,
				subject: subjects,
			})
			.from(assessments)
			.innerJoin(sectionSubjects, eq(assessments.sectionSubjectId, sectionSubjects.id))
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(and(...conditions, isNull(sections.deletedAt), isNull(subjects.deletedAt)))
			.orderBy(assessments.assessedOn, assessments.startsAt, desc(assessments.createdAt));
	}

	async findById(tenantId: string, assessmentId: string) {
		const [row] = await this.database.db
			.select({
				assessment: assessments,
				sectionSubject: sectionSubjects,
				section: sections,
				subject: subjects,
			})
			.from(assessments)
			.innerJoin(sectionSubjects, eq(assessments.sectionSubjectId, sectionSubjects.id))
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(
				and(
					eq(assessments.tenantId, tenantId),
					eq(assessments.id, assessmentId),
					isNull(sections.deletedAt),
					isNull(subjects.deletedAt),
				),
			)
			.limit(1);
		return row ?? null;
	}

	async create(input: typeof assessments.$inferInsert) {
		const [row] = await this.database.db.insert(assessments).values(input).returning();
		return row;
	}

	async update(
		tenantId: string,
		assessmentId: string,
		input: Partial<typeof assessments.$inferInsert>,
	) {
		const [row] = await this.database.db
			.update(assessments)
			.set({ ...input, updatedAt: new Date() })
			.where(and(eq(assessments.tenantId, tenantId), eq(assessments.id, assessmentId)))
			.returning();
		return row ?? null;
	}

	async listResults(tenantId: string, assessmentId: string) {
		return this.database.db
			.select({
				result: assessmentResults,
				student: students,
			})
			.from(assessmentResults)
			.innerJoin(students, eq(assessmentResults.studentId, students.id))
			.where(
				and(
					eq(assessmentResults.tenantId, tenantId),
					eq(assessmentResults.assessmentId, assessmentId),
					isNull(students.deletedAt),
				),
			)
			.orderBy(students.lastName, students.firstName);
	}

	async upsertResults(input: {
		tenantId: string;
		assessmentId: string;
		results: Array<{
			studentId: string;
			score: string | null;
			status: (typeof assessmentResults.$inferInsert)['status'];
		}>;
	}) {
		const now = new Date();

		return this.database.db.transaction(async (transaction) => {
			const saved = [];

			for (const resultInput of input.results) {
				// oxlint-disable-next-line no-await-in-loop -- upserts share one transaction connection
				const [upserted] = await transaction
					.insert(assessmentResults)
					.values({
						tenantId: input.tenantId,
						assessmentId: input.assessmentId,
						studentId: resultInput.studentId,
						score: resultInput.score,
						status: resultInput.status,
					})
					.onConflictDoUpdate({
						target: [assessmentResults.assessmentId, assessmentResults.studentId],
						set: {
							score: resultInput.score,
							status: resultInput.status,
							updatedAt: now,
						},
					})
					.returning();
				if (upserted) saved.push(upserted);
			}

			return saved;
		});
	}

	async listRecipientStudentIds(tenantId: string, assessmentId: string) {
		const rows = await this.database.db
			.select({ studentId: assessmentRecipients.studentId })
			.from(assessmentRecipients)
			.where(
				and(
					eq(assessmentRecipients.tenantId, tenantId),
					eq(assessmentRecipients.assessmentId, assessmentId),
				),
			);
		return rows.map((row) => row.studentId);
	}

	async countRecipients(tenantId: string, assessmentId: string) {
		const rows = await this.listRecipientStudentIds(tenantId, assessmentId);
		return rows.length;
	}

	async syncRecipients(tenantId: string, assessmentId: string, studentIds: string[]) {
		await this.database.db.transaction(async (transaction) => {
			await transaction
				.delete(assessmentRecipients)
				.where(
					and(
						eq(assessmentRecipients.tenantId, tenantId),
						eq(assessmentRecipients.assessmentId, assessmentId),
					),
				);

			if (studentIds.length === 0) return;

			await transaction.insert(assessmentRecipients).values(
				studentIds.map((studentId) => ({
					tenantId,
					assessmentId,
					studentId,
				})),
			);
		});
	}

	async listResultsForStudent(tenantId: string, studentId: string) {
		return this.database.db
			.select({
				result: assessmentResults,
				assessment: assessments,
				section: sections,
				subject: subjects,
			})
			.from(assessmentResults)
			.innerJoin(assessments, eq(assessmentResults.assessmentId, assessments.id))
			.innerJoin(sectionSubjects, eq(assessments.sectionSubjectId, sectionSubjects.id))
			.innerJoin(sections, eq(sectionSubjects.sectionId, sections.id))
			.innerJoin(subjects, eq(sectionSubjects.subjectId, subjects.id))
			.where(
				and(
					eq(assessmentResults.tenantId, tenantId),
					eq(assessmentResults.studentId, studentId),
					isNull(sections.deletedAt),
					isNull(subjects.deletedAt),
				),
			)
			.orderBy(desc(assessments.assessedOn));
	}
}
