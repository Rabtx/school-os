import { Injectable } from '@nestjs/common';
import { and, eq, inArray, lt, lte, or, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import { type OutboxEventRecord, outboxEvents } from '@/database/schema';

@Injectable()
export class OutboxRepository {
	constructor(private readonly database: DatabaseService) {}

	/**
	 * Claims up to `limit` events that are due: pending ones past their backoff, and processing ones
	 * whose lease expired (their worker died). Each claim takes a lease and counts an attempt.
	 */
	async claimPendingBatch(limit: number, leaseMs: number): Promise<OutboxEventRecord[]> {
		if (limit <= 0) {
			return [];
		}

		const now = new Date();
		const due = or(
			and(eq(outboxEvents.status, 'pending'), lte(outboxEvents.nextAttemptAt, now)),
			and(eq(outboxEvents.status, 'processing'), lt(outboxEvents.lockedUntil, now)),
		);

		return this.database.db.transaction(async (tx) => {
			return tx
				.update(outboxEvents)
				.set({
					status: 'processing',
					lockedUntil: new Date(now.getTime() + leaseMs),
					attempts: sql`${outboxEvents.attempts} + 1`,
				})
				.where(
					and(
						due,
						inArray(
							outboxEvents.id,
							tx
								.select({ id: outboxEvents.id })
								.from(outboxEvents)
								.where(due)
								.orderBy(outboxEvents.createdAt)
								.limit(limit)
								.for('update', { skipLocked: true }),
						),
					),
				)
				.returning();
		});
	}

	async markProcessed(eventId: string): Promise<void> {
		await this.database.db
			.update(outboxEvents)
			.set({ status: 'processed', processedAt: new Date(), lockedUntil: null, lastError: null })
			.where(and(eq(outboxEvents.id, eventId), eq(outboxEvents.status, 'processing')));
	}

	/** Schedules another attempt with backoff, or dead-letters the event after `maxAttempts`. */
	async markFailed(event: OutboxEventRecord, error: string, maxAttempts: number): Promise<void> {
		const lastError = error.slice(0, 2000);
		const exhausted = event.attempts >= maxAttempts;
		await this.database.db
			.update(outboxEvents)
			.set(
				exhausted
					? { status: 'dead', processedAt: new Date(), lockedUntil: null, lastError }
					: {
							status: 'pending',
							lockedUntil: null,
							nextAttemptAt: new Date(Date.now() + outboxBackoffMs(event.attempts)),
							lastError,
						},
			)
			.where(and(eq(outboxEvents.id, event.id), eq(outboxEvents.status, 'processing')));
	}
}

/** 30s, 1m, 2m, 4m ... capped at one hour. */
export function outboxBackoffMs(attempts: number): number {
	return Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 3_600_000);
}
