import {
	ConflictException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';

import type { ApprovalRequestRecord, MembershipRecord } from '@/database/schema';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import type { ApprovalCard, ApprovalEffect, ApprovalFact } from './approval-handler';
import type { CreateApprovalInput } from './approvals.dto';
import { ApprovalsRegistry } from './approvals.registry';
import { type ApprovalRow, ApprovalsRepository } from './approvals.repository';

import { UNDO_WINDOW_MS } from './approval-constants';

export { UNDO_WINDOW_MS };
const QUEUE_LIMIT = 100;
const MINE_LIMIT = 50;

export type ApprovalView = {
	id: string;
	type: string;
	label: string;
	status: ApprovalRequestRecord['status'];
	risk: ApprovalRequestRecord['risk'];
	approverRole: ApprovalRequestRecord['approverRole'];
	/** The handler's stored snapshot, e.g. which session and student a change is for. */
	payload: unknown;
	note: string | null;
	requester: { membershipId: string | null; name: string | null };
	createdAt: string;
	expiresAt: string | null;
	card: ApprovalCard;
	decision: { by: string | null; at: string; reason: string | null } | null;
	/** Set once approved: what happened, and until when it can be undone. */
	effect: { headline: string; facts: ApprovalFact[] } | null;
	undoUntil: string | null;
	/** Set once expired: what stayed in place. */
	expiry: { summary: string; facts: ApprovalFact[] } | null;
	/** Set once declined: the line the requester sees. */
	declined: string | null;
};

export type ApprovalQueue = {
	pending: ApprovalView[];
	today: { approved: number; declined: number; expired: number; longestWaitMinutes: number | null };
};

type StoredEffect = ApprovalEffect;

@Injectable()
export class ApprovalsService {
	private readonly logger = new Logger(ApprovalsService.name);

	constructor(
		private readonly approvals: ApprovalsRepository,
		private readonly registry: ApprovalsRegistry,
		private readonly membershipAccess: MembershipsService,
	) {}

	async getQueue(userId: string, tenantId: string, now = new Date()): Promise<ApprovalQueue> {
		await this.requireDecider(userId, tenantId);
		await this.approvals.expireDue(tenantId, now);
		const [pending, decided] = await Promise.all([
			this.approvals.listPending(tenantId, QUEUE_LIMIT),
			this.approvals.summarizeDecidedSince(tenantId, startOfDay(now)),
		]);
		const count = (status: string) => decided.find((row) => row.status === status)?.count ?? 0;
		const waits = decided
			.map((row) => (row.longestWaitMs === null ? null : Number(row.longestWaitMs)))
			.filter((value): value is number => value !== null);
		return {
			pending: pending.map((row) => this.toView(row)),
			today: {
				approved: count('approved'),
				declined: count('declined'),
				expired: count('expired'),
				longestWaitMinutes: waits.length > 0 ? Math.round(Math.max(...waits) / 60_000) : null,
			},
		};
	}

	async listMine(userId: string, tenantId: string): Promise<ApprovalView[]> {
		const membership = await this.membershipAccess.requireActiveMembership(userId, tenantId);
		await this.approvals.expireDue(tenantId, new Date());
		const rows = await this.approvals.listByRequester(tenantId, membership.id, MINE_LIMIT);
		return rows.map((row) => this.toView(row));
	}

	async get(userId: string, tenantId: string, id: string): Promise<ApprovalView> {
		const membership = await this.membershipAccess.requireActiveMembership(userId, tenantId);
		const row = await this.requireRow(tenantId, id);
		if (
			row.requestedByMembershipId !== membership.id &&
			!(await this.membershipAccess.isManagementMember(membership))
		) {
			throw notFound();
		}
		return this.toView(row);
	}

	async create(userId: string, tenantId: string, body: CreateApprovalInput): Promise<ApprovalView> {
		const membership = await this.membershipAccess.requireActiveMembership(userId, tenantId);
		const handler = this.registry.get(body.type);
		const input = handler.inputSchema.parse(body.input);
		const prepared = await handler.prepare({ userId, tenantId }, input);
		let created: ApprovalRequestRecord;
		try {
			created = await this.approvals.insert({
				tenantId,
				type: handler.type,
				payload: prepared.payload,
				dedupeKey: prepared.dedupeKey,
				risk: prepared.risk,
				approverRole: prepared.approverRole,
				expiresAt: prepared.expiresAt,
				note: body.note || null,
				requestedByMembershipId: membership.id,
			});
		} catch (error) {
			if (isUniqueViolation(error)) {
				throw new ConflictException({
					code: 'APPROVAL_ALREADY_PENDING',
					message: 'A request for this is already waiting for a decision.',
				});
			}
			throw error;
		}
		return this.toView(await this.requireRow(tenantId, created.id));
	}

	/**
	 * Claims the request, then applies it as the approver. If applying fails the claim is released
	 * so the request goes back to the queue instead of being marked approved with nothing done.
	 */
	async approve(userId: string, tenantId: string, id: string): Promise<ApprovalView> {
		const approver = await this.requireDecider(userId, tenantId);
		const row = await this.requirePending(tenantId, id);
		await this.requireApproverRole(approver, row);
		const handler = this.registry.get(row.type);

		const decidedAt = new Date();
		const claimed = await this.approvals.transition({
			tenantId,
			id,
			from: 'pending',
			set: { status: 'approved', decidedByMembershipId: approver.id, decidedAt },
			audit: null,
		});
		if (!claimed) throw alreadyDecided();

		let effect: ApprovalEffect;
		try {
			effect = await handler.apply({ tenantId, approver }, row.payload);
		} catch (error) {
			await this.approvals.transition({
				tenantId,
				id,
				from: 'approved',
				set: { status: 'pending', decidedByMembershipId: null, decidedAt: null },
				audit: null,
			});
			throw error;
		}

		await this.approvals.transition({
			tenantId,
			id,
			from: 'approved',
			set: { result: effect, undoUntil: new Date(decidedAt.getTime() + UNDO_WINDOW_MS) },
			audit: {
				action: 'approvals.approved',
				actorMembershipId: approver.id,
				metadata: { headline: effect.headline },
			},
		});
		return this.toView(await this.requireRow(tenantId, id));
	}

	async decline(userId: string, tenantId: string, id: string, reason: string) {
		const approver = await this.requireDecider(userId, tenantId);
		const row = await this.requirePending(tenantId, id);
		await this.requireApproverRole(approver, row);
		const declined = await this.approvals.transition({
			tenantId,
			id,
			from: 'pending',
			set: {
				status: 'declined',
				decidedByMembershipId: approver.id,
				decidedAt: new Date(),
				decisionReason: reason,
			},
			audit: { action: 'approvals.declined', actorMembershipId: approver.id, metadata: { reason } },
		});
		if (!declined) throw alreadyDecided();
		await this.registry.get(row.type).release?.({ tenantId }, row.payload);
		return this.toView(await this.requireRow(tenantId, id));
	}

	/** Reverses an approval inside its window and puts the request back in the queue. */
	async undo(userId: string, tenantId: string, id: string): Promise<ApprovalView> {
		const approver = await this.requireDecider(userId, tenantId);
		const row = await this.requireRow(tenantId, id);
		const effect = row.result as StoredEffect | null;
		const now = new Date();
		if (row.status !== 'approved' || !effect || !row.undoUntil || row.undoUntil <= now) {
			throw new ConflictException({
				code: 'APPROVAL_UNDO_CLOSED',
				message: 'This approval can no longer be undone.',
			});
		}
		const reopened = await this.approvals.transition({
			tenantId,
			id,
			from: 'approved',
			undoOpenAt: now,
			set: {
				status: 'pending',
				decidedByMembershipId: null,
				decidedAt: null,
				result: null,
				undoUntil: null,
			},
			audit: { action: 'approvals.undone', actorMembershipId: approver.id },
		});
		if (!reopened) {
			throw new ConflictException({
				code: 'APPROVAL_UNDO_CLOSED',
				message: 'This approval can no longer be undone.',
			});
		}
		try {
			await this.registry.get(row.type).undo({ tenantId, approver }, row.payload, effect.undo);
		} catch (error) {
			this.logger.error(`Undo of approval ${id} failed after reopening it`, error as Error);
			throw error;
		}
		return this.toView(await this.requireRow(tenantId, id));
	}

	/** The requester withdraws a request nobody has decided yet. */
	async cancel(userId: string, tenantId: string, id: string): Promise<ApprovalView> {
		const membership = await this.membershipAccess.requireActiveMembership(userId, tenantId);
		const row = await this.requirePending(tenantId, id);
		if (row.requestedByMembershipId !== membership.id) throw notFound();
		const cancelled = await this.approvals.transition({
			tenantId,
			id,
			from: 'pending',
			set: { status: 'cancelled', decidedAt: new Date() },
			audit: { action: 'approvals.cancelled', actorMembershipId: membership.id },
		});
		if (!cancelled) throw alreadyDecided();
		await this.registry.get(row.type).release?.({ tenantId }, row.payload);
		return this.toView(await this.requireRow(tenantId, id));
	}

	/** For the sidebar count; no permission check, the caller already scopes to leadership. */
	countPending(tenantId: string, now = new Date()): Promise<number> {
		return this.approvals.countPending(tenantId, now);
	}

	private toView(row: ApprovalRow): ApprovalView {
		const handler = this.registry.get(row.type);
		const effect = row.status === 'approved' ? (row.result as StoredEffect | null) : null;
		return {
			id: row.id,
			type: row.type,
			label: handler.label,
			status: row.status,
			risk: row.risk,
			approverRole: row.approverRole,
			payload: row.payload,
			note: row.note,
			requester: { membershipId: row.requestedByMembershipId, name: row.requesterName },
			createdAt: row.createdAt.toISOString(),
			expiresAt: row.expiresAt?.toISOString() ?? null,
			card: handler.describe(row.payload),
			decision: row.decidedAt
				? { by: row.deciderName, at: row.decidedAt.toISOString(), reason: row.decisionReason }
				: null,
			effect: effect ? { headline: effect.headline, facts: effect.facts } : null,
			undoUntil: effect ? (row.undoUntil?.toISOString() ?? null) : null,
			expiry: row.status === 'expired' ? handler.expired(row.payload) : null,
			declined:
				row.status === 'declined' ? handler.declined(row.payload, row.decisionReason ?? '') : null,
		};
	}

	private async requireDecider(userId: string, tenantId: string): Promise<MembershipRecord> {
		const membership = await this.membershipAccess.requireActiveMembership(userId, tenantId);
		if (!(await this.membershipAccess.isManagementMember(membership))) {
			throw new ForbiddenException({
				code: 'APPROVALS_FORBIDDEN',
				message: 'Only school leadership can decide approvals.',
			});
		}
		return membership;
	}

	private async requireApproverRole(approver: MembershipRecord, row: ApprovalRow) {
		if (row.approverRole !== 'owner') return;
		const roles = await this.membershipAccess.listRoleCodes(approver.id, approver.role);
		if (!roles.includes('owner')) {
			throw new ForbiddenException({
				code: 'APPROVAL_NEEDS_OWNER',
				message: 'Only the school owner can decide this one.',
			});
		}
	}

	private async requireRow(tenantId: string, id: string): Promise<ApprovalRow> {
		const row = await this.approvals.findById(tenantId, id);
		if (!row) throw notFound();
		return row;
	}

	private async requirePending(tenantId: string, id: string): Promise<ApprovalRow> {
		const row = await this.requireRow(tenantId, id);
		if (row.status === 'pending' && row.expiresAt && row.expiresAt <= new Date()) {
			await this.approvals.expireDue(tenantId, new Date());
			throw alreadyDecided();
		}
		if (row.status !== 'pending') throw alreadyDecided();
		return row;
	}
}

/** Midnight UTC; "today" in the summary is a rough day, not the school's local day. */
function startOfDay(now: Date): Date {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function notFound() {
	return new NotFoundException({ code: 'APPROVAL_NOT_FOUND', message: 'Approval not found' });
}

function alreadyDecided() {
	return new ConflictException({
		code: 'APPROVAL_ALREADY_DECIDED',
		message: 'Someone already decided this request.',
	});
}

function isUniqueViolation(error: unknown): boolean {
	const code = (error as { code?: string } | null)?.code;
	const causeCode = (error as { cause?: { code?: string } } | null)?.cause?.code;
	return code === '23505' || causeCode === '23505';
}
