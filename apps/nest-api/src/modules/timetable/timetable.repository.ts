import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	classes,
	memberships,
	sections,
	subjects,
	timetableEntries,
	timetablePeriods,
	userProfiles,
	users,
} from '@/database/schema';

@Injectable()
export class TimetableRepository {
	constructor(private readonly database: DatabaseService) {}

	async listPeriods(tenantId: string) {
		return this.database.db
			.select()
			.from(timetablePeriods)
			.where(eq(timetablePeriods.tenantId, tenantId))
			.orderBy(asc(timetablePeriods.sortOrder));
	}

	async listTeacherEntriesForDay(tenantId: string, teacherMembershipId: string, dayOfWeek: number) {
		return this.database.db
			.select({
				entry: timetableEntries,
				period: timetablePeriods,
				section: sections,
				subject: subjects,
				className: classes.name,
			})
			.from(timetableEntries)
			.innerJoin(timetablePeriods, eq(timetableEntries.periodId, timetablePeriods.id))
			.innerJoin(sections, eq(timetableEntries.sectionId, sections.id))
			.leftJoin(subjects, eq(timetableEntries.subjectId, subjects.id))
			.innerJoin(classes, eq(sections.classId, classes.id))
			.where(
				and(
					eq(timetableEntries.tenantId, tenantId),
					eq(timetableEntries.teacherMembershipId, teacherMembershipId),
					eq(timetableEntries.dayOfWeek, dayOfWeek),
				),
			)
			.orderBy(asc(timetablePeriods.sortOrder));
	}

	/** Every entry for one section across the week, with subject and teacher display name. */
	async listSectionEntries(tenantId: string, sectionId: string) {
		return this.database.db
			.select({
				entry: timetableEntries,
				subject: subjects,
				teacherName: sql<string | null>`(
					select coalesce(nullif(${userProfiles.displayName}, ''), ${users.username})
					from ${memberships}
					join ${users} on ${users.id} = ${memberships.userId}
					left join ${userProfiles} on ${userProfiles.userId} = ${users.id}
					where ${memberships.id} = ${timetableEntries.teacherMembershipId}
				)`,
			})
			.from(timetableEntries)
			.leftJoin(subjects, eq(timetableEntries.subjectId, subjects.id))
			.where(
				and(eq(timetableEntries.tenantId, tenantId), eq(timetableEntries.sectionId, sectionId)),
			);
	}

	async findSection(tenantId: string, sectionId: string) {
		const [row] = await this.database.db
			.select({ section: sections, className: classes.name })
			.from(sections)
			.innerJoin(classes, eq(sections.classId, classes.id))
			.where(and(eq(sections.tenantId, tenantId), eq(sections.id, sectionId)))
			.limit(1);
		return row ?? null;
	}

	async countEntries(tenantId: string): Promise<number> {
		const [row] = await this.database.db
			.select({ count: count() })
			.from(timetableEntries)
			.where(eq(timetableEntries.tenantId, tenantId));
		return row?.count ?? 0;
	}

	async insertPeriods(values: (typeof timetablePeriods.$inferInsert)[]) {
		if (values.length === 0) return [];
		return this.database.db.insert(timetablePeriods).values(values).returning();
	}

	async insertEntries(values: (typeof timetableEntries.$inferInsert)[]) {
		if (values.length === 0) return [];
		return this.database.db.insert(timetableEntries).values(values).returning();
	}
}
