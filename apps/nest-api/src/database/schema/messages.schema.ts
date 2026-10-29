import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

import { guardians } from './guardians.schema';
import { memberships } from './memberships.schema';
import { students } from './students.schema';
import { tenants } from './tenants.schema';

export type MessageDirection = 'to_family' | 'from_family';
export type MessageChannel = 'app' | 'whatsapp' | 'sms';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

/**
 * One conversation between the school and a guardian about one child (Messages, Figma
 * `77:66449`). Staff who can see the child can read and reply; the guardian sees only their own.
 */
export const messageThreads = pgTable(
	'message_threads',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		guardianId: uuid('guardian_id')
			.notNull()
			.references(() => guardians.id, { onDelete: 'cascade' }),
		studentId: uuid('student_id')
			.notNull()
			.references(() => students.id, { onDelete: 'cascade' }),
		/** True while the family's latest message has no reply from the school. */
		needsReply: boolean('needs_reply').notNull().default(false),
		lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
		lastMessagePreview: varchar('last_message_preview', { length: 200 }).notNull().default(''),
		lastMessageDirection: varchar('last_message_direction', { length: 16 })
			.$type<MessageDirection>()
			.notNull()
			.default('to_family'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex('message_threads_guardian_student_unique').on(
			table.tenantId,
			table.guardianId,
			table.studentId,
		),
		index('message_threads_tenant_last_idx').on(table.tenantId, table.lastMessageAt),
		index('message_threads_student_idx').on(table.tenantId, table.studentId),
	],
);

export const messages = pgTable(
	'messages',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		threadId: uuid('thread_id')
			.notNull()
			.references(() => messageThreads.id, { onDelete: 'cascade' }),
		direction: varchar('direction', { length: 16 }).$type<MessageDirection>().notNull(),
		/** Who wrote it: a staff member, or the guardian's own membership. */
		senderMembershipId: uuid('sender_membership_id').references(() => memberships.id, {
			onDelete: 'set null',
		}),
		body: text('body').notNull(),
		channel: varchar('channel', { length: 16 }).$type<MessageChannel>().notNull().default('app'),
		status: varchar('status', { length: 16 }).$type<MessageStatus>().notNull().default('sent'),
		readAt: timestamp('read_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [index('messages_thread_created_idx').on(table.threadId, table.createdAt)],
);

export type MessageThreadRecord = typeof messageThreads.$inferSelect;
export type MessageRecord = typeof messages.$inferSelect;
