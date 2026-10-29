import {
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

import { guardians } from './guardians.schema';
import { memberships } from './memberships.schema';
import { tenants } from './tenants.schema';

export type NoticeStatus = 'draft' | 'pending_approval' | 'sent';

/** Who a notice goes to: every parent, the parents of some classes, staff, or everyone. */
export type NoticeAudience =
	| { kind: 'all_parents' }
	| { kind: 'sections'; sectionIds: string[] }
	| { kind: 'staff' }
	| { kind: 'everyone' };

/**
 * A notice to families or staff (Admin · Notices, Figma `185:56501`). Leadership sends directly;
 * a teacher's notice goes through approvals. Sending fixes the recipients in `notice_recipients`.
 */
export const notices = pgTable(
	'notices',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		title: varchar('title', { length: 160 }).notNull(),
		body: text('body').notNull(),
		/** Validated against `noticeAudienceSchema` on every write. */
		audience: jsonb('audience').$type<NoticeAudience>().notNull(),
		status: varchar('status', { length: 24 }).$type<NoticeStatus>().notNull().default('draft'),
		createdByMembershipId: uuid('created_by_membership_id').references(() => memberships.id, {
			onDelete: 'set null',
		}),
		sentByMembershipId: uuid('sent_by_membership_id').references(() => memberships.id, {
			onDelete: 'set null',
		}),
		sentAt: timestamp('sent_at', { withTimezone: true }),
		recipientCount: integer('recipient_count').notNull().default(0),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('notices_tenant_status_idx').on(table.tenantId, table.status, table.updatedAt),
		index('notices_creator_idx').on(table.tenantId, table.createdByMembershipId),
	],
);

/**
 * One row per person a sent notice reached: a guardian (their app account, if any, reads it) or
 * a staff member. `read_at` is set when they open it.
 */
export const noticeRecipients = pgTable(
	'notice_recipients',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		noticeId: uuid('notice_id')
			.notNull()
			.references(() => notices.id, { onDelete: 'cascade' }),
		guardianId: uuid('guardian_id').references(() => guardians.id, { onDelete: 'cascade' }),
		/** The account that reads it in the app: the guardian's, or the staff member's. */
		membershipId: uuid('membership_id').references(() => memberships.id, { onDelete: 'set null' }),
		readAt: timestamp('read_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex('notice_recipients_notice_guardian_unique').on(table.noticeId, table.guardianId),
		uniqueIndex('notice_recipients_notice_membership_unique').on(
			table.noticeId,
			table.membershipId,
		),
		index('notice_recipients_membership_idx').on(table.tenantId, table.membershipId),
	],
);

export type NoticeRecord = typeof notices.$inferSelect;
export type NoticeRecipientRecord = typeof noticeRecipients.$inferSelect;
