import { index, integer, jsonb, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { memberships } from './memberships.schema';
import { tenants } from './tenants.schema';

/**
 * A school's attendance rules, one row per saved version. The newest version is the one in force;
 * older rows stay so every change can be traced to who made it and when.
 */
export const attendancePolicies = pgTable(
	'attendance_policies',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		version: integer('version').notNull(),
		/** Validated against `attendancePolicySchema` on every write and read. */
		policy: jsonb('policy').notNull(),
		createdByMembershipId: uuid('created_by_membership_id').references(() => memberships.id, {
			onDelete: 'set null',
		}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex('attendance_policies_tenant_version_unique').on(table.tenantId, table.version),
		index('attendance_policies_tenant_id_idx').on(table.tenantId),
	],
);

export type AttendancePolicyRecord = typeof attendancePolicies.$inferSelect;
