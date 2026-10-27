import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { tenants } from './tenants.schema';

export const roles = pgTable(
	'roles',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
		code: varchar('code', { length: 64 }).notNull(),
		name: varchar('name', { length: 128 }).notNull(),
		description: text('description'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('roles_tenant_id_idx').on(table.tenantId),
		index('roles_code_idx').on(table.code),
		uniqueIndex('roles_platform_code_unique')
			.on(table.code)
			.where(sql`tenant_id IS NULL`),
		uniqueIndex('roles_tenant_code_unique')
			.on(table.tenantId, table.code)
			.where(sql`tenant_id IS NOT NULL`),
	],
);

export type RoleRecord = typeof roles.$inferSelect;
export type NewRoleRecord = typeof roles.$inferInsert;
