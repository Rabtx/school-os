/* oxlint-disable no-await-in-loop -- seeding runs in order so each row exists before its dependents */
import 'dotenv/config';

import { hash } from 'bcryptjs';
import { and, eq, inArray, like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { DEFAULT_PERIOD_DEFS, ROOM_NAMES } from '../../modules/timetable/timetable.utils';
import * as schema from '../schema';
import {
	ATTENDANCE_WEIGHTS,
	CAMPUS_DEFS,
	CITIES,
	FIRST_NAMES_FEMALE,
	FIRST_NAMES_MALE,
	GRADE_NAMES,
	LAST_NAMES,
	OCCUPATIONS,
	PREVIOUS_SCHOOLS,
	SEED_STUDENT_CODE_PREFIX,
	SUBJECT_DEFS,
	TEACHER_QUALIFICATIONS,
	TEACHER_SPECIALIZATIONS,
} from './fixtures';
import { dateBetween, formatDate, intBetween, mulberry32, pick, pickWeighted } from './random';

const BATCH_SIZE = 80;
const STUDENTS_PER_SECTION = 26;
const BCRYPT_ROUNDS = 10;
const RNG = mulberry32(20260723);

type Db = ReturnType<typeof drizzle<typeof schema>>;

type CampusRow = typeof schema.campuses.$inferSelect;
type ClassRow = typeof schema.classes.$inferSelect;
type SectionRow = typeof schema.sections.$inferSelect;
type SubjectRow = typeof schema.subjects.$inferSelect;

async function main(): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error(
			'DATABASE_URL is required. Copy apps/nest-api/.env.example and set DATABASE_URL.',
		);
	}

	const tenantId = process.env.SEED_TENANT_ID?.trim();
	const force = process.env.SEED_FORCE === '1' || process.env.SEED_FORCE === 'true';
	const studentTarget = Number(process.env.SEED_STUDENT_COUNT ?? '900');

	const client = postgres(databaseUrl, { max: 1, prepare: false });
	const db = drizzle(client, { schema });

	try {
		const tenant = await resolveTenant(db, tenantId);
		console.log(`Seeding tenant: ${tenant.name} (${tenant.id})`);

		const existingSeedStudents = await countSeedStudents(db, tenant.id);
		if (existingSeedStudents > 0 && !force) {
			const attendanceSessions = await countAttendanceSessions(db, tenant.id);
			if (attendanceSessions === 0) {
				console.log(
					`Found ${existingSeedStudents} seeded students without attendance — completing attendance seed…`,
				);
				const campuses = await db
					.select()
					.from(schema.campuses)
					.where(eq(schema.campuses.tenantId, tenant.id));
				const sections = await db
					.select()
					.from(schema.sections)
					.where(eq(schema.sections.tenantId, tenant.id));
				const [teacher] = await db
					.select({ membershipId: schema.staffProfiles.membershipId })
					.from(schema.staffProfiles)
					.where(eq(schema.staffProfiles.tenantId, tenant.id))
					.limit(1);
				await seedAttendance(db, tenant.id, campuses, sections, teacher?.membershipId ?? null);
				console.log('Attendance seed complete.');
				return;
			}

			const timetableEntries = await countTimetableEntries(db, tenant.id);
			if (timetableEntries === 0) {
				console.log('No timetable entries — generating demo teacher schedules…');
				await seedTimetable(db, tenant.id);
				console.log('Timetable seed complete.');
				return;
			}

			console.log(
				`Found ${existingSeedStudents} seeded students (code prefix "${SEED_STUDENT_CODE_PREFIX}").`,
			);
			console.log('Skipping seed. Set SEED_FORCE=1 to replace seeded demo data.');
			return;
		}

		if (force && existingSeedStudents > 0) {
			console.log('SEED_FORCE=1 — removing previous seeded demo data…');
			await clearSeedData(db, tenant.id);
		}

		await ensureTenantConfig(db, tenant.id, tenant.name);

		const campuses = await ensureCampuses(db, tenant.id);
		const academicYear = await ensureAcademicYear(db, tenant.id);
		const classes = await ensureClasses(db, tenant.id);
		const sections = await ensureSections(db, tenant.id, campuses, classes, academicYear.id);
		const subjects = await ensureSubjects(db, tenant.id);
		const teachers = await seedTeachers(db, tenant.id, campuses, sections.length);

		await assignHomeroomTeachers(db, sections, teachers);
		await seedSectionSubjects(db, tenant.id, sections, subjects, teachers);

		const studentCount = await seedStudentsAndGuardians(
			db,
			tenant.id,
			campuses,
			sections,
			academicYear.id,
			Math.min(studentTarget, sections.length * STUDENTS_PER_SECTION),
		);

		await seedAttendance(db, tenant.id, campuses, sections, teachers[0]?.membershipId ?? null);
		await seedTimetable(db, tenant.id);

		console.log('\nSeed complete.');
		console.log(`  Campuses:     ${campuses.length}`);
		console.log(`  Grades:       ${classes.length}`);
		console.log(`  Sections:     ${sections.length}`);
		console.log(`  Teachers:     ${teachers.length}`);
		console.log(`  Students:     ${studentCount}`);
		console.log(`  Subjects:     ${subjects.length}`);
		console.log('\nOpen /admin to view the dashboard with live data.');
	} finally {
		await client.end();
	}
}

async function resolveTenant(db: Db, tenantId?: string) {
	if (tenantId) {
		const [tenant] = await db
			.select()
			.from(schema.tenants)
			.where(eq(schema.tenants.id, tenantId))
			.limit(1);
		if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);
		return tenant;
	}

	const [tenant] = await db
		.select()
		.from(schema.tenants)
		.where(eq(schema.tenants.status, 'active'))
		.orderBy(schema.tenants.createdAt)
		.limit(1);

	if (!tenant) {
		throw new Error(
			'No active tenant found. Create an organization in the app first, or set SEED_TENANT_ID.',
		);
	}

	return tenant;
}

async function countAttendanceSessions(db: Db, tenantId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.attendanceSessions)
		.where(eq(schema.attendanceSessions.tenantId, tenantId));
	return row?.count ?? 0;
}

async function countSeedStudents(db: Db, tenantId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.students)
		.where(
			and(
				eq(schema.students.tenantId, tenantId),
				like(schema.students.studentCode, `${SEED_STUDENT_CODE_PREFIX}%`),
			),
		);
	return row?.count ?? 0;
}

async function clearSeedData(db: Db, tenantId: string): Promise<void> {
	const seedStudents = await db
		.select({ id: schema.students.id })
		.from(schema.students)
		.where(
			and(
				eq(schema.students.tenantId, tenantId),
				like(schema.students.studentCode, `${SEED_STUDENT_CODE_PREFIX}%`),
			),
		);
	const studentIds = seedStudents.map((row) => row.id);

	if (studentIds.length > 0) {
		await db
			.delete(schema.attendanceMarks)
			.where(inArray(schema.attendanceMarks.studentId, studentIds));
	}

	await db
		.delete(schema.attendanceSessions)
		.where(eq(schema.attendanceSessions.tenantId, tenantId));
	await db.delete(schema.studentGuardians).where(eq(schema.studentGuardians.tenantId, tenantId));
	await db.delete(schema.guardians).where(eq(schema.guardians.tenantId, tenantId));

	if (studentIds.length > 0) {
		await db.delete(schema.enrollments).where(inArray(schema.enrollments.studentId, studentIds));
		await db.delete(schema.students).where(inArray(schema.students.id, studentIds));
	}

	const seedUsers = await db
		.select({ id: schema.users.id, email: schema.users.email })
		.from(schema.users)
		.where(like(schema.users.email, 'seed.teacher.%@northwood.demo'));

	for (const user of seedUsers) {
		const memberships = await db
			.select({ id: schema.memberships.id })
			.from(schema.memberships)
			.where(
				and(eq(schema.memberships.tenantId, tenantId), eq(schema.memberships.userId, user.id)),
			);
		const membershipIds = memberships.map((row) => row.id);

		if (membershipIds.length > 0) {
			await db
				.delete(schema.sectionSubjects)
				.where(inArray(schema.sectionSubjects.teacherMembershipId, membershipIds));
			await db
				.delete(schema.staffProfiles)
				.where(inArray(schema.staffProfiles.membershipId, membershipIds));
			await db
				.delete(schema.membershipRoles)
				.where(inArray(schema.membershipRoles.membershipId, membershipIds));
			await db.delete(schema.memberships).where(inArray(schema.memberships.id, membershipIds));
		}

		await db.delete(schema.users).where(eq(schema.users.id, user.id));
	}

	await db.delete(schema.sectionSubjects).where(eq(schema.sectionSubjects.tenantId, tenantId));
	await db.delete(schema.timetableEntries).where(eq(schema.timetableEntries.tenantId, tenantId));
	await db.delete(schema.timetablePeriods).where(eq(schema.timetablePeriods.tenantId, tenantId));
	await db
		.update(schema.sections)
		.set({ homeroomTeacherMembershipId: null, updatedAt: new Date() })
		.where(eq(schema.sections.tenantId, tenantId));
}

async function ensureTenantConfig(db: Db, tenantId: string, tenantName: string): Promise<void> {
	await db.insert(schema.tenantSettings).values({ tenantId }).onConflictDoNothing();
	await db
		.insert(schema.tenantBranding)
		.values({ tenantId, displayNameEn: tenantName })
		.onConflictDoNothing();
	await db.insert(schema.tenantCommunicationPolicies).values({ tenantId }).onConflictDoNothing();
}

async function ensureCampuses(db: Db, tenantId: string): Promise<CampusRow[]> {
	const existing = await db
		.select()
		.from(schema.campuses)
		.where(eq(schema.campuses.tenantId, tenantId));

	const byCode = new Map(existing.map((campus) => [campus.code, campus]));
	const result: CampusRow[] = [...existing];

	for (const def of CAMPUS_DEFS) {
		if (byCode.has(def.code)) continue;
		const [created] = await db
			.insert(schema.campuses)
			.values({
				tenantId,
				name: def.name,
				code: def.code,
				address: def.address,
				geoLat: def.geoLat,
				geoLng: def.geoLng,
				status: 'active',
			})
			.returning();
		if (created) {
			byCode.set(def.code, created);
			result.push(created);
		}
	}

	return result.filter((campus) => CAMPUS_DEFS.some((def) => def.code === campus.code));
}

async function ensureAcademicYear(db: Db, tenantId: string) {
	const [existingActive] = await db
		.select()
		.from(schema.academicYears)
		.where(
			and(eq(schema.academicYears.tenantId, tenantId), eq(schema.academicYears.status, 'active')),
		)
		.limit(1);

	if (existingActive) return existingActive;

	const now = new Date();
	const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
	const name = `${year}-${year + 1}`;

	const [created] = await db
		.insert(schema.academicYears)
		.values({
			tenantId,
			name,
			startsOn: `${year}-08-01`,
			endsOn: `${year + 1}-06-30`,
			status: 'active',
		})
		.onConflictDoNothing({ target: [schema.academicYears.tenantId, schema.academicYears.name] })
		.returning();

	if (created) return created;

	const [fallback] = await db
		.select()
		.from(schema.academicYears)
		.where(eq(schema.academicYears.tenantId, tenantId))
		.limit(1);

	if (!fallback) throw new Error('Could not create academic year');
	return fallback;
}

async function ensureClasses(db: Db, tenantId: string): Promise<ClassRow[]> {
	const existing = await db
		.select()
		.from(schema.classes)
		.where(eq(schema.classes.tenantId, tenantId));

	if (existing.length >= GRADE_NAMES.length) {
		return existing.toSorted((a, b) => a.sortOrder - b.sortOrder);
	}

	const existingNames = new Set(existing.map((row) => row.name));
	const toInsert = GRADE_NAMES.filter((name) => !existingNames.has(name)).map((name, index) => ({
		tenantId,
		name,
		sortOrder: index + 1,
	}));

	if (toInsert.length > 0) {
		await db.insert(schema.classes).values(toInsert);
	}

	return db
		.select()
		.from(schema.classes)
		.where(eq(schema.classes.tenantId, tenantId))
		.orderBy(schema.classes.sortOrder);
}

async function ensureSections(
	db: Db,
	tenantId: string,
	campuses: CampusRow[],
	classes: ClassRow[],
	academicYearId: string,
): Promise<SectionRow[]> {
	const existing = await db
		.select()
		.from(schema.sections)
		.where(
			and(
				eq(schema.sections.tenantId, tenantId),
				eq(schema.sections.academicYearId, academicYearId),
			),
		);

	const existingKeys = new Set(
		existing.map((section) => `${section.campusId}:${section.classId}:${section.name}`),
	);

	const toInsert: (typeof schema.sections.$inferInsert)[] = [];
	for (const campus of campuses) {
		for (const schoolClass of classes) {
			for (const sectionName of ['A', 'B'] as const) {
				const key = `${campus.id}:${schoolClass.id}:${sectionName}`;
				if (existingKeys.has(key)) continue;
				toInsert.push({
					tenantId,
					campusId: campus.id,
					classId: schoolClass.id,
					academicYearId,
					name: `${schoolClass.name}-${sectionName}`,
					status: 'active',
				});
			}
		}
	}

	if (toInsert.length > 0) {
		await db.insert(schema.sections).values(toInsert);
	}

	return db
		.select()
		.from(schema.sections)
		.where(
			and(
				eq(schema.sections.tenantId, tenantId),
				eq(schema.sections.academicYearId, academicYearId),
			),
		);
}

async function ensureSubjects(db: Db, tenantId: string): Promise<SubjectRow[]> {
	const existing = await db
		.select()
		.from(schema.subjects)
		.where(eq(schema.subjects.tenantId, tenantId));

	const existingCodes = new Set(existing.map((row) => row.code));
	const toInsert = SUBJECT_DEFS.filter((subject) => !existingCodes.has(subject.code)).map(
		(subject) => ({
			tenantId,
			code: subject.code,
			name: subject.name,
			description: subject.description,
		}),
	);

	if (toInsert.length > 0) {
		await db.insert(schema.subjects).values(toInsert);
	}

	return db.select().from(schema.subjects).where(eq(schema.subjects.tenantId, tenantId));
}

type TeacherSeed = {
	membershipId: string;
	campusId: string;
	firstName: string;
	lastName: string;
};

async function seedTeachers(
	db: Db,
	tenantId: string,
	campuses: CampusRow[],
	sectionCount: number,
): Promise<TeacherSeed[]> {
	const targetCount = Math.max(48, Math.ceil(sectionCount * 0.6));
	const passwordHash = await hash('Teacher@123', BCRYPT_ROUNDS);
	const teachers: TeacherSeed[] = [];

	for (let index = 0; index < targetCount; index++) {
		const genderMale = RNG() > 0.45;
		const firstName = genderMale ? pick(RNG, FIRST_NAMES_MALE) : pick(RNG, FIRST_NAMES_FEMALE);
		const lastName = pick(RNG, LAST_NAMES);
		const campus = campuses[index % campuses.length];
		if (!campus) continue;

		const email = `seed.teacher.${index + 1}@northwood.demo`;
		const username = `seed_teacher_${index + 1}`;

		const [user] = await db
			.insert(schema.users)
			.values({
				email,
				username,
				passwordHash,
				emailVerifiedAt: new Date(),
				isActive: true,
			})
			.onConflictDoNothing({ target: schema.users.email })
			.returning();

		const resolvedUser =
			user ??
			(await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1))[0];

		if (!resolvedUser) continue;

		const [membership] = await db
			.insert(schema.memberships)
			.values({
				tenantId,
				userId: resolvedUser.id,
				campusId: campus.id,
				role: 'teacher',
				status: 'active',
			})
			.onConflictDoNothing({ target: [schema.memberships.tenantId, schema.memberships.userId] })
			.returning();

		const resolvedMembership =
			membership ??
			(
				await db
					.select()
					.from(schema.memberships)
					.where(
						and(
							eq(schema.memberships.tenantId, tenantId),
							eq(schema.memberships.userId, resolvedUser.id),
						),
					)
					.limit(1)
			)[0];

		if (!resolvedMembership) continue;

		await db
			.insert(schema.membershipRoles)
			.values({ membershipId: resolvedMembership.id, role: 'teacher' })
			.onConflictDoNothing({
				target: [schema.membershipRoles.membershipId, schema.membershipRoles.role],
			});

		const status = pickWeighted(RNG, [
			{ value: 'active' as const, weight: 92 },
			{ value: 'on_leave' as const, weight: 6 },
			{ value: 'inactive' as const, weight: 2 },
		]);

		await db
			.insert(schema.staffProfiles)
			.values({
				tenantId,
				membershipId: resolvedMembership.id,
				employeeCode: `TCH-${String(index + 1).padStart(4, '0')}`,
				phone: `+92 3${intBetween(RNG, 0, 4)}${intBetween(RNG, 1000000, 9999999)}`,
				qualification: pick(RNG, TEACHER_QUALIFICATIONS),
				specialization: pick(RNG, TEACHER_SPECIALIZATIONS),
				hireDate: formatDate(dateBetween(RNG, new Date(2015, 0, 1), new Date(2024, 6, 1))),
				status,
				notes: status === 'on_leave' ? 'Short leave — substitutes assigned' : null,
			})
			.onConflictDoNothing({ target: schema.staffProfiles.membershipId });

		teachers.push({
			membershipId: resolvedMembership.id,
			campusId: campus.id,
			firstName,
			lastName,
		});
	}

	return teachers;
}

async function assignHomeroomTeachers(
	db: Db,
	sections: SectionRow[],
	teachers: TeacherSeed[],
): Promise<void> {
	let teacherIndex = 0;
	for (const section of sections) {
		const campusTeachers = teachers.filter((teacher) => teacher.campusId === section.campusId);
		const teacher =
			campusTeachers[teacherIndex % Math.max(campusTeachers.length, 1)] ??
			teachers[teacherIndex % teachers.length];
		if (!teacher) continue;

		await db
			.update(schema.sections)
			.set({ homeroomTeacherMembershipId: teacher.membershipId, updatedAt: new Date() })
			.where(eq(schema.sections.id, section.id));

		teacherIndex += 1;
	}
}

async function seedSectionSubjects(
	db: Db,
	tenantId: string,
	sections: SectionRow[],
	subjects: SubjectRow[],
	teachers: TeacherSeed[],
): Promise<void> {
	const coreSubjects = subjects.filter((subject) =>
		['ENG', 'URD', 'MTH', 'SCI', 'ISL', 'PE'].includes(subject.code),
	);

	let teacherCursor = 0;
	for (const section of sections) {
		for (const subject of coreSubjects) {
			const teacher = teachers[teacherCursor % teachers.length];
			teacherCursor += 1;
			await db
				.insert(schema.sectionSubjects)
				.values({
					tenantId,
					sectionId: section.id,
					subjectId: subject.id,
					teacherMembershipId: teacher?.membershipId ?? null,
				})
				.onConflictDoNothing({
					target: [schema.sectionSubjects.sectionId, schema.sectionSubjects.subjectId],
				});
		}
	}
}

async function seedStudentsAndGuardians(
	db: Db,
	tenantId: string,
	campuses: CampusRow[],
	sections: SectionRow[],
	academicYearId: string,
	targetCount: number,
): Promise<number> {
	const campusById = new Map(campuses.map((campus) => [campus.id, campus]));
	let created = 0;
	let sequence = 1;

	const sectionsSorted = sections.toSorted((a, b) => {
		const campusA = campusById.get(a.campusId)?.code ?? '';
		const campusB = campusById.get(b.campusId)?.code ?? '';
		return campusA.localeCompare(campusB) || a.name.localeCompare(b.name);
	});

	for (const section of sectionsSorted) {
		if (created >= targetCount) break;

		const campus = campusById.get(section.campusId);
		if (!campus) continue;

		const campusCode = campus.code;
		const batchStudents: (typeof schema.students.$inferInsert)[] = [];
		const batchMeta: Array<{
			gender: 'male' | 'female';
			guardianFirst: string;
			guardianLast: string;
			relationship: 'father' | 'mother';
		}> = [];

		const sectionQuota = Math.min(STUDENTS_PER_SECTION, targetCount - created);

		for (let seat = 0; seat < sectionQuota; seat++) {
			const genderMale = RNG() > 0.48;
			const firstName = genderMale ? pick(RNG, FIRST_NAMES_MALE) : pick(RNG, FIRST_NAMES_FEMALE);
			const lastName = pick(RNG, LAST_NAMES);
			const location = pick(RNG, CITIES);
			const admittedRoll = RNG();
			const admittedOn =
				admittedRoll < 0.55
					? dateBetween(RNG, new Date(2023, 7, 1), new Date(2024, 6, 30))
					: admittedRoll < 0.85
						? dateBetween(RNG, new Date(2024, 7, 1), new Date(2025, 6, 30))
						: dateBetween(RNG, new Date(2025, 0, 1), new Date());

			const status = pickWeighted(RNG, [
				{ value: 'active' as const, weight: 92 },
				{ value: 'inactive' as const, weight: 5 },
				{ value: 'withdrawn' as const, weight: 2 },
				{ value: 'graduated' as const, weight: 1 },
			]);

			const studentCode = `${SEED_STUDENT_CODE_PREFIX}${campusCode}-25${String(sequence).padStart(4, '0')}`;
			sequence += 1;

			const dobYear = 2026 - intBetween(RNG, 6, 18);
			const guardianIsFather = RNG() > 0.35;
			const guardianFirst = guardianIsFather
				? pick(RNG, FIRST_NAMES_MALE)
				: pick(RNG, FIRST_NAMES_FEMALE);

			batchStudents.push({
				tenantId,
				campusId: campus.id,
				studentCode,
				firstName,
				lastName,
				dateOfBirth: `${dobYear}-${String(intBetween(RNG, 1, 12)).padStart(2, '0')}-${String(intBetween(RNG, 1, 28)).padStart(2, '0')}`,
				gender: genderMale ? 'male' : 'female',
				email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${intBetween(RNG, 1, 99)}@student.northwood.demo`,
				phone: `+92 3${intBetween(RNG, 0, 4)}${intBetween(RNG, 1000000, 9999999)}`,
				addressLine1: `${intBetween(RNG, 1, 120)} ${pick(RNG, ['Street', 'Lane', 'Road', 'Avenue'])} ${pick(RNG, ['Garden', 'Model Town', 'Gulshan', 'Bahria'])}`,
				city: location.city,
				state: location.state,
				postalCode: location.postalCode,
				country: 'Pakistan',
				bloodGroup: pick(RNG, ['A+', 'B+', 'O+', 'AB+', 'A-', 'B-'] as const),
				emergencyContactName: `${guardianFirst} ${lastName}`,
				emergencyContactPhone: `+92 3${intBetween(RNG, 0, 4)}${intBetween(RNG, 1000000, 9999999)}`,
				admittedOn: formatDate(admittedOn),
				previousSchool: RNG() > 0.55 ? pick(RNG, PREVIOUS_SCHOOLS) : null,
				status,
			});

			batchMeta.push({
				gender: genderMale ? 'male' : 'female',
				guardianFirst,
				guardianLast: lastName,
				relationship: guardianIsFather ? 'father' : 'mother',
			});
		}

		for (let offset = 0; offset < batchStudents.length; offset += BATCH_SIZE) {
			const chunk = batchStudents.slice(offset, offset + BATCH_SIZE);
			const metaChunk = batchMeta.slice(offset, offset + BATCH_SIZE);
			const insertedStudents = await db.insert(schema.students).values(chunk).returning();

			const guardiansToInsert: (typeof schema.guardians.$inferInsert)[] = [];
			const linksToInsert: (typeof schema.studentGuardians.$inferInsert)[] = [];
			const enrollmentsToInsert: (typeof schema.enrollments.$inferInsert)[] = [];

			for (let i = 0; i < insertedStudents.length; i++) {
				const student = insertedStudents[i];
				const meta = metaChunk[i];
				if (!student || !meta) continue;

				const location = pick(RNG, CITIES);
				guardiansToInsert.push({
					tenantId,
					firstName: meta.guardianFirst,
					lastName: meta.guardianLast,
					email: `${meta.guardianFirst.toLowerCase()}.${meta.guardianLast.toLowerCase()}@family.northwood.demo`,
					phone: student.emergencyContactPhone,
					city: location.city,
					state: location.state,
					postalCode: location.postalCode,
					country: 'Pakistan',
					occupation: pick(RNG, OCCUPATIONS),
					preferredChannel: pickWeighted(RNG, [
						{ value: 'whatsapp' as const, weight: 55 },
						{ value: 'phone' as const, weight: 25 },
						{ value: 'sms' as const, weight: 15 },
						{ value: 'email' as const, weight: 5 },
					]),
				});
			}

			const insertedGuardians = await db
				.insert(schema.guardians)
				.values(guardiansToInsert)
				.returning();

			for (let i = 0; i < insertedStudents.length; i++) {
				const student = insertedStudents[i];
				const guardian = insertedGuardians[i];
				const meta = metaChunk[i];
				if (!student || !guardian || !meta) continue;

				linksToInsert.push({
					tenantId,
					studentId: student.id,
					guardianId: guardian.id,
					relationship: meta.relationship,
					isPrimary: true,
					canPickup: true,
					receivesNotifications: true,
				});

				if (student.status === 'active') {
					enrollmentsToInsert.push({
						tenantId,
						studentId: student.id,
						sectionId: section.id,
						academicYearId,
						status: 'active',
						enrolledOn: student.admittedOn ?? formatDate(new Date()),
					});
				}
			}

			if (linksToInsert.length > 0) {
				await db.insert(schema.studentGuardians).values(linksToInsert);
			}
			if (enrollmentsToInsert.length > 0) {
				await db.insert(schema.enrollments).values(enrollmentsToInsert);
			}

			created += insertedStudents.length;
		}
	}

	return created;
}

async function seedAttendance(
	db: Db,
	tenantId: string,
	campuses: CampusRow[],
	sections: SectionRow[],
	markedByMembershipId: string | null,
): Promise<void> {
	const today = new Date();
	const dates: string[] = [];

	for (let offset = 1; offset <= 10 && dates.length < 5; offset++) {
		const day = new Date(today);
		day.setDate(today.getDate() - offset);
		const weekday = day.getDay();
		if (weekday === 0 || weekday === 6) continue;
		dates.push(formatDate(day));
	}

	for (const section of sections) {
		const campus = campuses.find((row) => row.id === section.campusId);
		if (!campus) continue;

		const enrolled = await db
			.select({ studentId: schema.enrollments.studentId })
			.from(schema.enrollments)
			.where(
				and(eq(schema.enrollments.sectionId, section.id), eq(schema.enrollments.status, 'active')),
			);

		if (enrolled.length === 0) continue;

		for (const sessionDate of dates) {
			const existingSession = await db
				.select()
				.from(schema.attendanceSessions)
				.where(
					and(
						eq(schema.attendanceSessions.tenantId, tenantId),
						eq(schema.attendanceSessions.sectionId, section.id),
						eq(schema.attendanceSessions.sessionDate, sessionDate),
					),
				)
				.limit(1);

			const resolvedSession =
				existingSession[0] ??
				(
					await db
						.insert(schema.attendanceSessions)
						.values({
							tenantId,
							campusId: campus.id,
							sectionId: section.id,
							sessionType: 'class',
							sessionDate,
						})
						.returning()
				)[0];

			if (!resolvedSession) continue;

			const existingMarks = await db
				.select({ studentId: schema.attendanceMarks.studentId })
				.from(schema.attendanceMarks)
				.where(eq(schema.attendanceMarks.sessionId, resolvedSession.id));
			const markedStudentIds = new Set(existingMarks.map((row) => row.studentId));

			const marks = enrolled
				.filter((row) => !markedStudentIds.has(row.studentId))
				.map((row) => ({
					tenantId,
					sessionId: resolvedSession.id,
					studentId: row.studentId,
					status: pickWeighted(RNG, ATTENDANCE_WEIGHTS),
					markedAt: new Date(`${sessionDate}T08:${intBetween(RNG, 10, 45)}:00+05:00`),
					markedByMembershipId,
				}));

			for (let offset = 0; offset < marks.length; offset += BATCH_SIZE) {
				await db.insert(schema.attendanceMarks).values(marks.slice(offset, offset + BATCH_SIZE));
			}
		}
	}
}

async function countTimetableEntries(db: Db, tenantId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(schema.timetableEntries)
		.where(eq(schema.timetableEntries.tenantId, tenantId));
	return row?.count ?? 0;
}

async function seedTimetable(db: Db, tenantId: string): Promise<void> {
	const existingPeriods = await db
		.select()
		.from(schema.timetablePeriods)
		.where(eq(schema.timetablePeriods.tenantId, tenantId));

	let periods = existingPeriods;
	if (periods.length === 0) {
		periods = await db
			.insert(schema.timetablePeriods)
			.values(
				DEFAULT_PERIOD_DEFS.map((period) => ({
					tenantId,
					name: period.name,
					startsAt: period.startsAt,
					endsAt: period.endsAt,
					kind: period.kind,
					sortOrder: period.sortOrder,
				})),
			)
			.returning();
	}

	const teachingPeriods = periods
		.filter((period) => period.kind === 'period')
		.toSorted((a, b) => a.sortOrder - b.sortOrder);
	if (teachingPeriods.length === 0) return;

	const assignments = await db
		.select({
			sectionId: schema.sectionSubjects.sectionId,
			subjectId: schema.sectionSubjects.subjectId,
			teacherMembershipId: schema.sectionSubjects.teacherMembershipId,
			campusId: schema.sections.campusId,
		})
		.from(schema.sectionSubjects)
		.innerJoin(schema.sections, eq(schema.sectionSubjects.sectionId, schema.sections.id))
		.where(
			and(
				eq(schema.sectionSubjects.tenantId, tenantId),
				sql`${schema.sectionSubjects.teacherMembershipId} IS NOT NULL`,
			),
		);

	const byTeacher = new Map<string, typeof assignments>();
	for (const assignment of assignments) {
		if (!assignment.teacherMembershipId) continue;
		const bucket = byTeacher.get(assignment.teacherMembershipId) ?? [];
		bucket.push(assignment);
		byTeacher.set(assignment.teacherMembershipId, bucket);
	}

	const entries: (typeof schema.timetableEntries.$inferInsert)[] = [];
	let roomIndex = 0;

	for (const [teacherMembershipId, teacherAssignments] of byTeacher) {
		const usedSlots = new Set<string>();
		for (let index = 0; index < teacherAssignments.length; index += 1) {
			const assignment = teacherAssignments[index];
			if (!assignment) continue;

			const dayOfWeek = 1 + (index % 5);
			const period = teachingPeriods[index % teachingPeriods.length];
			if (!period) continue;

			const slotKey = `${dayOfWeek}-${period.id}`;
			if (usedSlots.has(slotKey)) continue;
			usedSlots.add(slotKey);

			entries.push({
				tenantId,
				campusId: assignment.campusId,
				periodId: period.id,
				dayOfWeek,
				sectionId: assignment.sectionId,
				subjectId: assignment.subjectId,
				teacherMembershipId,
				roomName: ROOM_NAMES[roomIndex % ROOM_NAMES.length] ?? 'Room 1',
			});
			roomIndex += 1;
		}
	}

	for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
		await db
			.insert(schema.timetableEntries)
			.values(entries.slice(offset, offset + BATCH_SIZE))
			.onConflictDoNothing();
	}
}

void main().catch((error) => {
	console.error('Seed failed:', error);
	process.exit(1);
});
