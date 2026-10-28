import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { memberships } from './memberships.schema';
import { tenants } from './tenants.schema';

export type ApprovalStatus = 'pending' | 'approved' | 'declined' | 'expired' | 'cancelled';
export type ApprovalRisk = 'low' | 'medium' | 'high';
export type ApproverRole = 'leadership' | 'owner';

/**
 * Something a member asked leadership to decide (Approvals, Figma `82:37115`). The type names the
 * handler in the approvals registry that validates the payload, describes the card and applies the
 * decision. `result` keeps what applying changed, so an approval can be undone inside its window.
 */
export const approvalRequests = pgTable(
	'approval_requests',
	{
		id: uuid('id').defaultRandom().primaryKey(),
		tenantId: uuid('tenant_id')
			.notNull()
			.references(() => tenants.id, { onDelete: 'cascade' }),
		type: varchar('type', { length: 64 }).notNull(),
		status: varchar('status', { length: 16 }).$type<ApprovalStatus>().notNull().default('pending'),
		risk: varchar('risk', { length: 16 }).$type<ApprovalRisk>().notNull().default('low'),
		approverRole: varchar('approver_role', { length: 16 })
			.$type<ApproverRole>()
			.notNull()
			.default('leadership'),
		/** Validated by the type's handler on create; includes a snapshot for the card. */
		payload: jsonb('payload').notNull(),
		/** One pending request per thing being changed, e.g. a student's mark on a day. */
		dedupeKey: varchar('dedupe_key', { length: 200 }).notNull(),
		note: text('note'),
		requestedByMembershipId: uuid('requested_by_membership_id').references(() => memberships.id, {
			onDelete: 'set null',
		}),
		decidedByMembershipId: uuid('decided_by_membership_id').references(() => memberships.id, {
			onDelete: 'set null',
		}),
		decidedAt: timestamp('decided_at', { withTimezone: true }),
		decisionReason: text('decision_reason'),
		result: jsonb('result'),
		undoUntil: timestamp('undo_until', { withTimezone: true }),
		expiresAt: timestamp('expires_at', { withTimezone: true }),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	},
	(table) => [
		index('approval_requests_tenant_status_idx').on(table.tenantId, table.status, table.createdAt),
		index('approval_requests_requester_idx').on(table.tenantId, table.requestedByMembershipId),
		uniqueIndex('approval_requests_pending_dedupe_unique')
			.on(table.tenantId, table.dedupeKey)
			.where(sql`status = 'pending'`),
	],
);

export type ApprovalRequestRecord = typeof approvalRequests.$inferSelect;
