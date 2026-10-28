import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, gte, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	type ApprovalRequestRecord,
	type ApprovalStatus,
	approvalRequests,
	auditLogs,
} from '@/database/schema';

/**
 * A member's display name, or their username when they have not set one. Written with explicit
 * aliases: Drizzle drops table qualifiers inside a subquery on a single-table select.
 */
function memberName(column: 'requested_by_membership_id' | 'decided_by_membership_id') {
	return sql<string | null>`(
		select coalesce(nullif(up.display_name, ''), u.username)
		from memberships m
		join users u on u.id = m.user_id
		left join user_profiles up on up.user_id = u.id
		where m.id = "approval_requests".${sql.identifier(column)}
	)`;
}

export type ApprovalRow = ApprovalRequestRecord & {
	requesterName: string | null;
	deciderName: string | null;
};

type AuditEntry = {
	action: string;
	actorMembershipId: string | null;
	metadata?: Record<string, unknown>;
};

@Injectable()
export class ApprovalsRepository {
	constructor(private readonly database: DatabaseService) {}

	private selectRows() {
		return this.database.db
			.select({
				request: approvalRequests,
				requesterName: memberName('requested_by_membership_id'),
				deciderName: memberName('decided_by_membership_id'),
			})
			.from(approvalRequests);
	}

	private static toRow(row: {
		request: ApprovalRequestRecord;
		requesterName: string | null;
		deciderName: string | null;
	}): ApprovalRow {
		return { ...row.request, requesterName: row.requesterName, deciderName: row.deciderName };
	}

	async findById(tenantId: string, id: string): Promise<ApprovalRow | null> {
		const [row] = await this.selectRows()
			.where(and(eq(approvalRequests.tenantId, tenantId), eq(approvalRequests.id, id)))
			.limit(1);
		return row ? ApprovalsRepository.toRow(row) : null;
	}

	/** Oldest first, so the queue clears in the order people asked. */
	async listPending(tenantId: string, limit: number): Promise<ApprovalRow[]> {
		const rows = await this.selectRows()
			.where(and(eq(approvalRequests.tenantId, tenantId), eq(approvalRequests.status, 'pending')))
			.orderBy(asc(approvalRequests.createdAt))
			.limit(limit);
		return rows.map(ApprovalsRepository.toRow);
	}

	async listByRequester(tenantId: string, membershipId: string, limit: number) {
		const rows = await this.selectRows()
			.where(
				and(
					eq(approvalRequests.tenantId, tenantId),
					eq(approvalRequests.requestedByMembershipId, membershipId),
				),
			)
			.orderBy(desc(approvalRequests.createdAt))
			.limit(limit);
		return rows.map(ApprovalsRepository.toRow);
	}

	/** Pending requests still inside their time, for the sidebar count. */
	async countPending(tenantId: string, now: Date): Promise<number> {
		const [row] = await this.database.db
			.select({ count: sql<number>`count(*)::int` })
			.from(approvalRequests)
			.where(
				and(
					eq(approvalRequests.tenantId, tenantId),
					eq(approvalRequests.status, 'pending'),
					or(isNull(approvalRequests.expiresAt), gt(approvalRequests.expiresAt, now)),
				),
			);
		return row?.count ?? 0;
	}

	/** Decisions since a moment, for "Nothing is waiting" (Figma `221:121411`). */
	async summarizeDecidedSince(tenantId: string, since: Date) {
		return this.database.db
			.select({
				status: approvalRequests.status,
				count: sql<number>`count(*)::int`,
				longestWaitMs: sql<
					number | null
				>`max(extract(epoch from (${approvalRequests.decidedAt} - ${approvalRequests.createdAt})) * 1000)::bigint`,
			})
			.from(approvalRequests)
			.where(
				and(
					eq(approvalRequests.tenantId, tenantId),
					isNotNull(approvalRequests.decidedAt),
					gte(approvalRequests.decidedAt, since),
				),
			)
			.groupBy(approvalRequests.status);
	}

	async insert(
		values: typeof approvalRequests.$inferInsert & { tenantId: string },
	): Promise<ApprovalRequestRecord> {
		return this.database.db.transaction(async (transaction) => {
			const [row] = await transaction.insert(approvalRequests).values(values).returning();
			if (!row) throw new Error('Approval request insert returned no row');
			await transaction.insert(auditLogs).values({
				tenantId: row.tenantId,
				actorMembershipId: row.requestedByMembershipId,
				action: 'approvals.requested',
				resourceType: 'approval_request',
				resourceId: row.id,
				metadata: { type: row.type },
			});
			return row;
		});
	}

	/**
	 * Moves a request from one status to another only if it is still in `from`, so two leaders
	 * deciding at once cannot both win. Returns null when someone else got there first.
	 */
	async transition(input: {
		tenantId: string;
		id: string;
		from: ApprovalStatus;
		set: Partial<typeof approvalRequests.$inferInsert>;
		audit: AuditEntry | null;
		/** Only if the undo window is still open at this moment. */
		undoOpenAt?: Date;
	}): Promise<ApprovalRequestRecord | null> {
		return this.database.db.transaction(async (transaction) => {
			const conditions = [
				eq(approvalRequests.tenantId, input.tenantId),
				eq(approvalRequests.id, input.id),
				eq(approvalRequests.status, input.from),
			];
			if (input.undoOpenAt) conditions.push(gt(approvalRequests.undoUntil, input.undoOpenAt));
			const [row] = await transaction
				.update(approvalRequests)
				.set({ ...input.set, updatedAt: new Date() })
				.where(and(...conditions))
				.returning();
			if (!row) return null;
			if (input.audit) {
				await transaction.insert(auditLogs).values({
					tenantId: input.tenantId,
					actorMembershipId: input.audit.actorMembershipId,
					action: input.audit.action,
					resourceType: 'approval_request',
					resourceId: row.id,
					metadata: { type: row.type, ...input.audit.metadata },
				});
			}
			return row;
		});
	}

	/** Expiry is applied lazily: whoever reads the queue first after the deadline moves them. */
	async expireDue(tenantId: string, now: Date) {
		return this.database.db.transaction(async (transaction) => {
			const rows = await transaction
				.update(approvalRequests)
				.set({ status: 'expired', decidedAt: now, updatedAt: now })
				.where(
					and(
						eq(approvalRequests.tenantId, tenantId),
						eq(approvalRequests.status, 'pending'),
						lt(approvalRequests.expiresAt, now),
					),
				)
				.returning({ id: approvalRequests.id, type: approvalRequests.type });
			if (rows.length > 0) {
				await transaction.insert(auditLogs).values(
					rows.map((row) => ({
						tenantId,
						actorMembershipId: null,
						action: 'approvals.expired',
						resourceType: 'approval_request',
						resourceId: row.id,
						metadata: { type: row.type },
					})),
				);
			}
			return rows.length;
		});
	}
}
