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

export type DeliveryChannel = 'whatsapp' | 'sms';
export type DeliverySource = 'message' | 'notice';
export type DeliveryStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';
export type DeliveryLanguage = 'en' | 'ur';

/**
 * Whether a school has switched a channel on (Settings · Communication, Figma `77:89099`). The
 * provider and its credentials come from the environment; this row is the school's switch.
 */
export const tenantMessagingChannels = pgTable(
	'tenant_messaging_channels',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		channel: varchar('channel', { length: 16 }).$type<DeliveryChannel>().notNull(),
		status: varchar('status', { length: 16 }).$type<'connected' | 'disconnected'>().notNull(),
		connectedByMembershipId: uuid('connected_by_membership_id').references(() => memberships.id, {
			onDelete: 'set null',
		}),
		connectedAt: timestamp('connected_at', { withTimezone: true }),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [uniqueIndex('tenant_messaging_channels_unique').on(table.tenantId, table.channel)],
);

/**
 * One attempt to reach a guardian outside the app: a message or notice over WhatsApp, or the SMS
 * that falls back when WhatsApp fails. Receipts from the provider move it to delivered and read.
 */
export const messageDeliveries = pgTable(
	'message_deliveries',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		sourceType: varchar('source_type', { length: 16 }).$type<DeliverySource>().notNull(),
		sourceId: uuid('source_id').notNull(),
		guardianId: uuid('guardian_id')
			.notNull()
			.references(() => guardians.id, { onDelete: 'cascade' }),
		toPhone: varchar('to_phone', { length: 32 }).notNull(),
		channel: varchar('channel', { length: 16 }).$type<DeliveryChannel>().notNull(),
		template: varchar('template', { length: 64 }),
		/** Values for the template's {{1}}, {{2}}…, as sent. */
		templateParams: jsonb('template_params').$type<string[]>(),
		language: varchar('language', { length: 8 }).$type<DeliveryLanguage>().notNull().default('en'),
		/** The text as the guardian sees it, kept for the log. */
		body: text('body').notNull(),
		status: varchar('status', { length: 16 }).$type<DeliveryStatus>().notNull().default('queued'),
		providerMessageId: varchar('provider_message_id', { length: 160 }),
		error: text('error'),
		attempts: integer('attempts').notNull().default(0),
		/** Not sent before this: the approval undo window, quiet hours, or a retry backoff. */
		notBefore: timestamp('not_before', { withTimezone: true }).notNull().defaultNow(),
		sentAt: timestamp('sent_at', { withTimezone: true }),
		deliveredAt: timestamp('delivered_at', { withTimezone: true }),
		readAt: timestamp('read_at', { withTimezone: true }),
		/** The WhatsApp delivery this SMS stands in for. */
		fallbackForId: uuid('fallback_for_id'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('message_deliveries_due_idx').on(table.status, table.notBefore),
		index('message_deliveries_source_idx').on(table.sourceType, table.sourceId),
		index('message_deliveries_tenant_created_idx').on(table.tenantId, table.createdAt),
		index('message_deliveries_phone_idx').on(table.toPhone, table.createdAt),
		uniqueIndex('message_deliveries_provider_id_unique').on(table.providerMessageId),
	],
);

export type MessageDeliveryRecord = typeof messageDeliveries.$inferSelect;
