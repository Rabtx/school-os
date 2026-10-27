import { index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { membershipRole, memberships } from './memberships.schema';

export const membershipRoles = pgTable(
	'membership_roles',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		membershipId: uuid('membership_id')
			.notNull()
			.references(() => memberships.id, { onDelete: 'cascade' }),
		role: membershipRole('role').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex('membership_roles_membership_role_unique').on(table.membershipId, table.role),
		index('membership_roles_membership_id_idx').on(table.membershipId),
	],
);

export type MembershipRoleRecord = typeof membershipRoles.$inferSelect;
