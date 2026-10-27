import { Injectable } from '@nestjs/common';
import { and, asc, eq, gte, isNull, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	academicYears,
	classes,
	enrollments,
	guardians,
	homeworkAssignments,
	type NavigationItemRecord,
	navigationItems,
	sections,
	students,
} from '@/database/schema';

@Injectable()
export class NavigationRepository {
	constructor(private readonly database: DatabaseService) {}

	async listBySurface(surface: NavigationItemRecord['surface']): Promise<NavigationItemRecord[]> {
		return this.database.db
			.select()
			.from(navigationItems)
			.where(and(eq(navigationItems.surface, surface), eq(navigationItems.isEnabled, true)))
			.orderBy(asc(navigationItems.sectionHeading), asc(navigationItems.sortOrder));
	}

	/** Counts shown next to sidebar items: active students, guardians, homework still due. */
	async countSidebarBadges(tenantId: string, now: Date) {
		const [[studentRow], [guardianRow], [homeworkRow]] = await Promise.all([
			this.database.db
				.select({ count: sql<number>`count(*)::int` })
				.from(students)
				.where(
					and(
						eq(students.tenantId, tenantId),
						eq(students.status, 'active'),
						isNull(students.deletedAt),
					),
				),
			this.database.db
				.select({ count: sql<number>`count(*)::int` })
				.from(guardians)
				.where(and(eq(guardians.tenantId, tenantId), isNull(guardians.deletedAt))),
			this.database.db
				.select({ count: sql<number>`count(*)::int` })
				.from(homeworkAssignments)
				.where(
					and(
						eq(homeworkAssignments.tenantId, tenantId),
						eq(homeworkAssignments.status, 'published'),
						gte(homeworkAssignments.dueAt, now),
					),
				),
		]);
		return {
			students: studentRow?.count ?? 0,
			guardians: guardianRow?.count ?? 0,
			homework: homeworkRow?.count ?? 0,
		};
	}

	/** Sections in the active academic year with their active enrollment counts. */
	async listActiveYearClasses(tenantId: string) {
		return this.database.db
			.select({
				sectionId: sections.id,
				campusId: sections.campusId,
				sectionName: sections.name,
				className: classes.name,
				studentCount: sql<number>`count(${enrollments.id}) filter (where ${enrollments.status} = 'active')::int`,
			})
			.from(sections)
			.innerJoin(classes, eq(classes.id, sections.classId))
			.innerJoin(
				academicYears,
				and(eq(academicYears.id, sections.academicYearId), eq(academicYears.status, 'active')),
			)
			.leftJoin(enrollments, eq(enrollments.sectionId, sections.id))
			.where(and(eq(sections.tenantId, tenantId), isNull(sections.deletedAt)))
			.groupBy(sections.id, classes.name)
			.orderBy(asc(classes.name), asc(sections.name));
	}
}
