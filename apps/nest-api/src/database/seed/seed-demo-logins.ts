/* oxlint-disable no-await-in-loop -- seeding runs in order so each row exists before its dependents */
import 'dotenv/config';

import { hash } from 'bcryptjs';
import { and, eq, isNull, like } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from '../schema';
import type { MembershipRecord } from '../schema/memberships.schema';
import { SEED_STUDENT_CODE_PREFIX } from './fixtures';

/** Shared dev password (min 12 chars for registration rules). */
export const DEMO_ROLE_PASSWORD = 'NorthwoodDemo1';

const BCRYPT_ROUNDS = 10;

const DEMO_ACCOUNTS: Array<{
	email: string;
	username: string;
	role: MembershipRecord['role'];
}> = [
	{ email: 'seed.principal@northwood.demo', username: 'seed_principal', role: 'principal' },
	{
		email: 'seed.vice-principal@northwood.demo',
		username: 'seed_vice_principal',
		role: 'vice_principal',
	},
	{ email: 'seed.admin@northwood.demo', username: 'seed_admin', role: 'admin' },
	{ email: 'seed.parent@northwood.demo', username: 'seed_parent', role: 'parent' },
	{ email: 'seed.student@northwood.demo', username: 'seed_student', role: 'student' },
];

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function ensureUser(db: Db, email: string, username: string, passwordHash: string) {
	const [inserted] = await db
		.insert(schema.users)
		.values({
			email,
			username,
			passwordHash,
			emailVerifiedAt: new Date(),
			isActive: true,
		})
		.onConflictDoUpdate({
			target: schema.users.email,
			set: { passwordHash, isActive: true, emailVerifiedAt: new Date(), updatedAt: new Date() },
		})
		.returning();

	if (inserted) return inserted;

	const [existing] = await db
		.select()
		.from(schema.users)
		.where(eq(schema.users.email, email))
		.limit(1);
	if (!existing) throw new Error(`Failed to resolve user: ${email}`);
	await db
		.update(schema.users)
		.set({ passwordHash, isActive: true, emailVerifiedAt: new Date(), updatedAt: new Date() })
		.where(eq(schema.users.id, existing.id));
	return existing;
}

async function ensureMembership(
	db: Db,
	tenantId: string,
	userId: string,
	campusId: string | null,
	role: MembershipRecord['role'],
) {
	const [inserted] = await db
		.insert(schema.memberships)
		.values({
			tenantId,
			userId,
			campusId,
			role,
			status: 'active',
		})
		.onConflictDoUpdate({
			target: [schema.memberships.tenantId, schema.memberships.userId],
			set: { role, campusId, status: 'active', updatedAt: new Date() },
		})
		.returning();

	const membership =
		inserted ??
		(
			await db
				.select()
				.from(schema.memberships)
				.where(
					and(eq(schema.memberships.tenantId, tenantId), eq(schema.memberships.userId, userId)),
				)
				.limit(1)
		)[0];

	if (!membership) throw new Error(`Failed to resolve membership for role ${role}`);

	await db
		.insert(schema.membershipRoles)
		.values({ membershipId: membership.id, role })
		.onConflictDoNothing({
			target: [schema.membershipRoles.membershipId, schema.membershipRoles.role],
		});

	return membership;
}

async function resetOwnerPassword(db: Db, tenantId: string, passwordHash: string) {
	const [ownerRow] = await db
		.select({ userId: schema.memberships.userId, email: schema.users.email })
		.from(schema.memberships)
		.innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
		.where(and(eq(schema.memberships.tenantId, tenantId), eq(schema.memberships.role, 'owner')))
		.limit(1);

	if (!ownerRow) {
		console.warn('No owner membership on tenant — skip owner password reset.');
		return null;
	}

	await db
		.update(schema.users)
		.set({ passwordHash, isActive: true, emailVerifiedAt: new Date(), updatedAt: new Date() })
		.where(eq(schema.users.id, ownerRow.userId));

	return ownerRow.email;
}

async function linkParentGuardian(db: Db, tenantId: string, membershipId: string) {
	const [guardian] = await db
		.select({ id: schema.guardians.id })
		.from(schema.guardians)
		.innerJoin(schema.studentGuardians, eq(schema.studentGuardians.guardianId, schema.guardians.id))
		.innerJoin(schema.students, eq(schema.students.id, schema.studentGuardians.studentId))
		.where(
			and(
				eq(schema.guardians.tenantId, tenantId),
				isNull(schema.guardians.deletedAt),
				isNull(schema.guardians.membershipId),
				like(schema.students.studentCode, `${SEED_STUDENT_CODE_PREFIX}%`),
				eq(schema.studentGuardians.isPrimary, true),
			),
		)
		.limit(1);

	if (!guardian) {
		console.warn('No unlinked primary guardian found — parent login will show empty My children.');
		return;
	}

	await db
		.update(schema.guardians)
		.set({
			membershipId,
			email: 'seed.parent@northwood.demo',
			updatedAt: new Date(),
		})
		.where(eq(schema.guardians.id, guardian.id));
}

async function linkStudentRecord(db: Db, tenantId: string, membershipId: string) {
	const [student] = await db
		.select({ id: schema.students.id, campusId: schema.students.campusId })
		.from(schema.students)
		.where(
			and(
				eq(schema.students.tenantId, tenantId),
				isNull(schema.students.deletedAt),
				isNull(schema.students.membershipId),
				like(schema.students.studentCode, `${SEED_STUDENT_CODE_PREFIX}%`),
			),
		)
		.limit(1);

	if (!student) {
		console.warn('No unlinked seed student found — student login will lack a profile link.');
		return;
	}

	await db
		.update(schema.students)
		.set({
			membershipId,
			email: 'seed.student@northwood.demo',
			updatedAt: new Date(),
		})
		.where(eq(schema.students.id, student.id));

	await db
		.update(schema.memberships)
		.set({ campusId: student.campusId, updatedAt: new Date() })
		.where(eq(schema.memberships.id, membershipId));
}

async function main(): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) {
		throw new Error('DATABASE_URL is required.');
	}

	const tenantId = process.env.SEED_TENANT_ID?.trim() ?? '1a126186-9d1d-4c2f-acf2-347285d7d234';

	const client = postgres(databaseUrl, { max: 1, prepare: false });
	const db = drizzle(client, { schema });

	try {
		const [tenant] = await db
			.select()
			.from(schema.tenants)
			.where(eq(schema.tenants.id, tenantId))
			.limit(1);
		if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);

		const [campus] = await db
			.select()
			.from(schema.campuses)
			.where(eq(schema.campuses.tenantId, tenantId))
			.limit(1);

		const passwordHash = await hash(DEMO_ROLE_PASSWORD, BCRYPT_ROUNDS);

		console.log(`Demo logins for tenant: ${tenant.name} (${tenant.id})\n`);

		const ownerEmail = await resetOwnerPassword(db, tenantId, passwordHash);
		if (ownerEmail) {
			console.log(`owner     | ${ownerEmail} | ${DEMO_ROLE_PASSWORD}`);
		}

		for (const account of DEMO_ACCOUNTS) {
			const user = await ensureUser(db, account.email, account.username, passwordHash);
			const membership = await ensureMembership(
				db,
				tenantId,
				user.id,
				campus?.id ?? null,
				account.role,
			);
			if (account.role === 'parent') {
				await linkParentGuardian(db, tenantId, membership.id);
			}
			if (account.role === 'student') {
				await linkStudentRecord(db, tenantId, membership.id);
			}
			console.log(`${account.role.padEnd(9)} | ${account.email} | ${DEMO_ROLE_PASSWORD}`);
		}

		console.log('\nteacher    | seed.teacher.1@northwood.demo | Teacher@123');
		console.log(
			'\nWeb: http://localhost:3000 — pick organization "AKES Network" (or your tenant name).',
		);
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
