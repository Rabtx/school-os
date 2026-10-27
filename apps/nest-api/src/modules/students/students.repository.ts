import { ConflictException, Injectable } from '@nestjs/common';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import { enrollments, type StudentRecord, studentGuardians, students } from '@/database/schema';
import { GuardiansRepository } from '@/modules/guardians/guardians.repository';

@Injectable()
export class StudentsRepository {
	constructor(
		private readonly database: DatabaseService,
		private readonly guardians: GuardiansRepository,
	) {}

	async listStudents(
		tenantId: string,
		filters?: { campusId?: string; status?: StudentRecord['status'] },
	) {
		const conditions = [eq(students.tenantId, tenantId), isNull(students.deletedAt)];
		if (filters?.campusId) conditions.push(eq(students.campusId, filters.campusId));
		if (filters?.status) conditions.push(eq(students.status, filters.status));

		return this.database.db
			.select()
			.from(students)
			.where(and(...conditions))
			.orderBy(asc(students.lastName), asc(students.firstName));
	}

	async listStudentsInSections(
		tenantId: string,
		sectionIds: string[],
		filters?: { campusId?: string; status?: StudentRecord['status'] },
	) {
		if (sectionIds.length === 0) return [];

		const conditions = [
			eq(students.tenantId, tenantId),
			isNull(students.deletedAt),
			eq(enrollments.status, 'active'),
			isNull(enrollments.deletedAt),
			inArray(enrollments.sectionId, sectionIds),
		];
		if (filters?.campusId) conditions.push(eq(students.campusId, filters.campusId));
		if (filters?.status) conditions.push(eq(students.status, filters.status));

		const rows = await this.database.db
			.selectDistinct({ student: students })
			.from(students)
			.innerJoin(enrollments, eq(enrollments.studentId, students.id))
			.where(and(...conditions))
			.orderBy(asc(students.lastName), asc(students.firstName));

		return rows.map((row) => row.student);
	}

	async findStudentById(tenantId: string, studentId: string) {
		const [student] = await this.database.db
			.select()
			.from(students)
			.where(
				and(
					eq(students.id, studentId),
					eq(students.tenantId, tenantId),
					isNull(students.deletedAt),
				),
			)
			.limit(1);
		return student ?? null;
	}

	async findStudentsByIds(tenantId: string, studentIds: string[]) {
		if (studentIds.length === 0) return [];
		return this.database.db
			.select()
			.from(students)
			.where(
				and(
					inArray(students.id, studentIds),
					eq(students.tenantId, tenantId),
					isNull(students.deletedAt),
				),
			);
	}

	async findStudentByMembershipId(tenantId: string, membershipId: string) {
		const [student] = await this.database.db
			.select()
			.from(students)
			.where(
				and(
					eq(students.tenantId, tenantId),
					eq(students.membershipId, membershipId),
					isNull(students.deletedAt),
				),
			)
			.limit(1);
		return student ?? null;
	}

	async findStudentByCode(tenantId: string, studentCode: string) {
		const [student] = await this.database.db
			.select()
			.from(students)
			.where(
				and(
					eq(students.tenantId, tenantId),
					eq(students.studentCode, studentCode),
					isNull(students.deletedAt),
				),
			)
			.limit(1);
		return student ?? null;
	}

	async createStudent(input: typeof students.$inferInsert) {
		const [student] = await this.database.db.insert(students).values(input).returning();
		return student;
	}

	async createStudentInTransaction(
		studentInput: typeof students.$inferInsert,
		guardianLinks?: Array<{
			guardian: Parameters<GuardiansRepository['createGuardian']>[0];
			link: {
				relationship: (typeof studentGuardians.$inferInsert)['relationship'];
				isPrimary: boolean;
				canPickup: boolean;
				receivesNotifications: boolean;
			};
		}>,
	) {
		return this.database.db.transaction(async (tx) => {
			const [student] = await tx
				.insert(students)
				.values(studentInput)
				.onConflictDoNothing({ target: [students.tenantId, students.studentCode] })
				.returning();

			if (!student) {
				throw new ConflictException({
					code: 'STUDENT_CODE_ALREADY_EXISTS',
					message: 'A student with this admission number already exists',
				});
			}

			if (guardianLinks?.length) {
				for (const { guardian: guardianInput, link } of guardianLinks) {
					// oxlint-disable-next-line no-await-in-loop -- inserts share one transaction connection
					const guardian = await this.guardians.createGuardianWithTx(tx, guardianInput);
					// oxlint-disable-next-line no-await-in-loop -- inserts share one transaction connection
					await this.guardians.linkStudentGuardianWithTx(tx, {
						tenantId: studentInput.tenantId,
						studentId: student.id,
						guardianId: guardian.id,
						relationship: link.relationship,
						isPrimary: link.isPrimary,
						canPickup: link.canPickup,
						receivesNotifications: link.receivesNotifications,
					});
				}
			}

			return student;
		});
	}

	async updateStudent(
		tenantId: string,
		studentId: string,
		input: Partial<typeof students.$inferInsert>,
	) {
		const [student] = await this.database.db
			.update(students)
			.set({ ...input, updatedAt: new Date() })
			.where(
				and(
					eq(students.id, studentId),
					eq(students.tenantId, tenantId),
					isNull(students.deletedAt),
				),
			)
			.returning();
		return student ?? null;
	}

	async listEnrollments(
		tenantId: string,
		filters?: { studentId?: string; sectionId?: string; academicYearId?: string },
		sectionScope?: string[],
	) {
		const conditions = [eq(enrollments.tenantId, tenantId), isNull(enrollments.deletedAt)];
		if (filters?.studentId) conditions.push(eq(enrollments.studentId, filters.studentId));
		if (filters?.sectionId) conditions.push(eq(enrollments.sectionId, filters.sectionId));
		if (filters?.academicYearId) {
			conditions.push(eq(enrollments.academicYearId, filters.academicYearId));
		}
		if (sectionScope && sectionScope.length > 0) {
			conditions.push(inArray(enrollments.sectionId, sectionScope));
		}

		return this.database.db
			.select()
			.from(enrollments)
			.where(and(...conditions))
			.orderBy(asc(enrollments.enrolledOn));
	}

	async listEnrollmentsForStudents(tenantId: string, studentIds: string[]) {
		if (studentIds.length === 0) return [];
		return this.database.db
			.select()
			.from(enrollments)
			.where(
				and(
					eq(enrollments.tenantId, tenantId),
					inArray(enrollments.studentId, studentIds),
					isNull(enrollments.deletedAt),
				),
			)
			.orderBy(asc(enrollments.enrolledOn));
	}

	async findEnrollmentById(tenantId: string, enrollmentId: string) {
		const [enrollment] = await this.database.db
			.select()
			.from(enrollments)
			.where(
				and(
					eq(enrollments.id, enrollmentId),
					eq(enrollments.tenantId, tenantId),
					isNull(enrollments.deletedAt),
				),
			)
			.limit(1);
		return enrollment ?? null;
	}

	async findActiveEnrollmentForYear(tenantId: string, studentId: string, academicYearId: string) {
		const [enrollment] = await this.database.db
			.select()
			.from(enrollments)
			.where(
				and(
					eq(enrollments.tenantId, tenantId),
					eq(enrollments.studentId, studentId),
					eq(enrollments.academicYearId, academicYearId),
					eq(enrollments.status, 'active'),
					isNull(enrollments.deletedAt),
				),
			)
			.limit(1);
		return enrollment ?? null;
	}

	async createEnrollment(input: typeof enrollments.$inferInsert) {
		const [enrollment] = await this.database.db.insert(enrollments).values(input).returning();
		return enrollment;
	}

	async createEnrollmentAtomic(input: typeof enrollments.$inferInsert) {
		return this.database.db.transaction(async (tx) => {
			const [existing] = await tx
				.select()
				.from(enrollments)
				.where(
					and(
						eq(enrollments.tenantId, input.tenantId),
						eq(enrollments.studentId, input.studentId),
						eq(enrollments.academicYearId, input.academicYearId),
						eq(enrollments.status, 'active'),
						isNull(enrollments.deletedAt),
					),
				)
				.limit(1)
				.for('update');

			if (existing) {
				throw new ConflictException({
					code: 'ACTIVE_ENROLLMENT_EXISTS',
					message: 'Student already has an active enrollment for this academic year',
				});
			}

			const [enrollment] = await tx.insert(enrollments).values(input).returning();
			return enrollment;
		});
	}

	async updateEnrollment(
		tenantId: string,
		enrollmentId: string,
		input: Partial<typeof enrollments.$inferInsert>,
	) {
		const [enrollment] = await this.database.db
			.update(enrollments)
			.set({ ...input, updatedAt: new Date() })
			.where(
				and(
					eq(enrollments.id, enrollmentId),
					eq(enrollments.tenantId, tenantId),
					isNull(enrollments.deletedAt),
				),
			)
			.returning();
		return enrollment ?? null;
	}
}
