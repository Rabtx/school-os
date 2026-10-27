import { Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import type { Database } from '@/database/database.service';
import { DatabaseService } from '@/database/database.service';
import { guardians, studentGuardians, students } from '@/database/schema';

@Injectable()
export class GuardiansRepository {
	constructor(private readonly database: DatabaseService) {}

	async listGuardians(tenantId: string) {
		return this.database.db
			.select()
			.from(guardians)
			.where(and(eq(guardians.tenantId, tenantId), isNull(guardians.deletedAt)))
			.orderBy(asc(guardians.lastName), asc(guardians.firstName));
	}

	/** Guardians linked to any of the given students, each once. */
	async listGuardiansForStudents(tenantId: string, studentIds: string[]) {
		if (studentIds.length === 0) return [];
		const linkedGuardianIds = this.database.db
			.select({ id: studentGuardians.guardianId })
			.from(studentGuardians)
			.where(
				and(
					eq(studentGuardians.tenantId, tenantId),
					inArray(studentGuardians.studentId, studentIds),
				),
			);
		return this.database.db
			.select()
			.from(guardians)
			.where(
				and(
					eq(guardians.tenantId, tenantId),
					inArray(guardians.id, linkedGuardianIds),
					isNull(guardians.deletedAt),
				),
			)
			.orderBy(asc(guardians.lastName), asc(guardians.firstName));
	}

	async findGuardianById(tenantId: string, guardianId: string) {
		const [row] = await this.database.db
			.select()
			.from(guardians)
			.where(
				and(
					eq(guardians.id, guardianId),
					eq(guardians.tenantId, tenantId),
					isNull(guardians.deletedAt),
				),
			)
			.limit(1);
		return row ?? null;
	}

	async createGuardian(input: typeof guardians.$inferInsert) {
		const [row] = await this.database.db.insert(guardians).values(input).returning();
		return row;
	}

	async createGuardianWithTx(tx: Database, input: typeof guardians.$inferInsert) {
		const [row] = await tx.insert(guardians).values(input).returning();
		return row;
	}

	async updateGuardian(
		tenantId: string,
		guardianId: string,
		input: Partial<typeof guardians.$inferInsert>,
	) {
		const [row] = await this.database.db
			.update(guardians)
			.set({ ...input, updatedAt: new Date() })
			.where(
				and(
					eq(guardians.id, guardianId),
					eq(guardians.tenantId, tenantId),
					isNull(guardians.deletedAt),
				),
			)
			.returning();
		return row ?? null;
	}

	async listStudentGuardians(tenantId: string, studentId: string) {
		return this.database.db
			.select({
				link: studentGuardians,
				guardian: guardians,
			})
			.from(studentGuardians)
			.innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
			.where(
				and(
					eq(studentGuardians.tenantId, tenantId),
					eq(studentGuardians.studentId, studentId),
					isNull(guardians.deletedAt),
				),
			);
	}

	async linkStudentGuardian(input: typeof studentGuardians.$inferInsert) {
		const [row] = await this.database.db.insert(studentGuardians).values(input).returning();
		return row;
	}

	async linkStudentGuardianWithTx(tx: Database, input: typeof studentGuardians.$inferInsert) {
		const [row] = await tx.insert(studentGuardians).values(input).returning();
		return row;
	}

	async listLinkedStudentsForGuardian(tenantId: string, guardianId: string) {
		return this.database.db
			.select({
				link: studentGuardians,
				student: students,
			})
			.from(studentGuardians)
			.innerJoin(students, eq(studentGuardians.studentId, students.id))
			.where(
				and(
					eq(studentGuardians.tenantId, tenantId),
					eq(studentGuardians.guardianId, guardianId),
					isNull(students.deletedAt),
				),
			);
	}

	async listLinkedStudentsForMembership(tenantId: string, membershipId: string) {
		return this.database.db
			.select({
				link: studentGuardians,
				student: students,
				guardian: guardians,
			})
			.from(guardians)
			.innerJoin(studentGuardians, eq(studentGuardians.guardianId, guardians.id))
			.innerJoin(students, eq(studentGuardians.studentId, students.id))
			.where(
				and(
					eq(guardians.tenantId, tenantId),
					eq(guardians.membershipId, membershipId),
					isNull(guardians.deletedAt),
					isNull(students.deletedAt),
				),
			);
	}
}
