import {
	boolean,
	index,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

import { memberships } from './memberships.schema';
import { students } from './students.schema';
import { tenants } from './tenants.schema';

export const guardianRelationship = pgEnum('guardian_relationship', [
	'father',
	'mother',
	'guardian',
	'step_parent',
	'grandparent',
	'sibling',
	'other',
]);

export const guardianPreferredChannel = pgEnum('guardian_preferred_channel', [
	'email',
	'phone',
	'whatsapp',
	'sms',
]);

export const guardians = pgTable(
	'guardians',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		membershipId: uuid('membership_id').references(() => memberships.id, { onDelete: 'set null' }),
		firstName: varchar('first_name', { length: 100 }).notNull(),
		lastName: varchar('last_name', { length: 100 }).notNull(),
		email: varchar('email', { length: 255 }),
		phone: varchar('phone', { length: 32 }),
		alternatePhone: varchar('alternate_phone', { length: 32 }),
		addressLine1: varchar('address_line1', { length: 255 }),
		addressLine2: varchar('address_line2', { length: 255 }),
		city: varchar('city', { length: 100 }),
		state: varchar('state', { length: 100 }),
		postalCode: varchar('postal_code', { length: 20 }),
		country: varchar('country', { length: 100 }),
		occupation: varchar('occupation', { length: 128 }),
		preferredChannel: guardianPreferredChannel('preferred_channel').notNull().default('phone'),
		/** Language for WhatsApp and SMS templates: English or Urdu. */
		preferredLanguage: varchar('preferred_language', { length: 8 })
			.$type<'en' | 'ur'>()
			.notNull()
			.default('en'),
		deletedAt: timestamp('deleted_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('guardians_tenant_id_idx').on(table.tenantId),
		index('guardians_membership_id_idx').on(table.membershipId),
	],
);

export type GuardianRecord = typeof guardians.$inferSelect;

export const studentGuardians = pgTable(
	'student_guardians',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		studentId: uuid('student_id')
			.notNull()
			.references(() => students.id, { onDelete: 'cascade' }),
		guardianId: uuid('guardian_id')
			.notNull()
			.references(() => guardians.id, { onDelete: 'cascade' }),
		relationship: guardianRelationship('relationship').notNull(),
		isPrimary: boolean('is_primary').notNull().default(false),
		canPickup: boolean('can_pickup').notNull().default(true),
		receivesNotifications: boolean('receives_notifications').notNull().default(true),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex('student_guardians_student_guardian_unique').on(table.studentId, table.guardianId),
		index('student_guardians_tenant_id_idx').on(table.tenantId),
		index('student_guardians_guardian_id_idx').on(table.guardianId),
	],
);

export type StudentGuardianRecord = typeof studentGuardians.$inferSelect;
