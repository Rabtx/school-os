import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	type DeliveryChannel,
	type DeliveryStatus,
	guardians,
	messageDeliveries,
	messages,
	messageThreads,
	noticeRecipients,
	notices,
	studentGuardians,
	students,
	tenantCommunicationPolicies,
	tenantMessagingChannels,
	tenants,
} from '@/database/schema';

/** Receipts only move a delivery forward: read never goes back to delivered. */
const STATUS_RANK: Record<DeliveryStatus, number> = {
	queued: 0,
	skipped: 0,
	failed: 1,
	sent: 2,
	delivered: 3,
	read: 4,
};

@Injectable()
export class DeliveryRepository {
	constructor(private readonly database: DatabaseService) {}

	async findChannel(tenantId: string, channel: DeliveryChannel) {
		const [row] = await this.database.db
			.select()
			.from(tenantMessagingChannels)
			.where(
				and(
					eq(tenantMessagingChannels.tenantId, tenantId),
					eq(tenantMessagingChannels.channel, channel),
				),
			)
			.limit(1);
		return row ?? null;
	}

	async setChannel(
		tenantId: string,
		channel: DeliveryChannel,
		status: 'connected' | 'disconnected',
		membershipId: string,
	) {
		const now = new Date();
		const values = {
			tenantId,
			channel,
			status,
			connectedByMembershipId: status === 'connected' ? membershipId : null,
			connectedAt: status === 'connected' ? now : null,
			updatedAt: now,
		};
		await this.database.db
			.insert(tenantMessagingChannels)
			.values(values)
			.onConflictDoUpdate({
				target: [tenantMessagingChannels.tenantId, tenantMessagingChannels.channel],
				set: values,
			});
	}

	/** The school's switches from Settings · Communication. */
	async findPolicy(tenantId: string) {
		const [row] = await this.database.db
			.select({
				whatsappEnabled: tenantCommunicationPolicies.whatsappEnabled,
				smsFallbackEnabled: tenantCommunicationPolicies.smsFallbackEnabled,
			})
			.from(tenantCommunicationPolicies)
			.where(eq(tenantCommunicationPolicies.tenantId, tenantId))
			.limit(1);
		return row ?? { whatsappEnabled: true, smsFallbackEnabled: true };
	}

	async findSchoolName(tenantId: string) {
		const [row] = await this.database.db
			.select({ name: tenants.name })
			.from(tenants)
			.where(eq(tenants.id, tenantId))
			.limit(1);
		return row?.name ?? 'School';
	}

	/** A message written to a family, with who it goes to. */
	async findMessageForDelivery(messageId: string) {
		const [row] = await this.database.db
			.select({
				messageId: messages.id,
				tenantId: messages.tenantId,
				direction: messages.direction,
				body: messages.body,
				threadId: messageThreads.id,
				guardianId: guardians.id,
				phone: guardians.phone,
				language: guardians.preferredLanguage,
				studentFirstName: students.firstName,
			})
			.from(messages)
			.innerJoin(messageThreads, eq(messageThreads.id, messages.threadId))
			.innerJoin(guardians, eq(guardians.id, messageThreads.guardianId))
			.innerJoin(students, eq(students.id, messageThreads.studentId))
			.where(eq(messages.id, messageId))
			.limit(1);
		return row ?? null;
	}

	/** A sent notice and the guardians it reached, with their numbers. */
	async findNoticeForDelivery(noticeId: string) {
		const [notice] = await this.database.db
			.select({
				id: notices.id,
				tenantId: notices.tenantId,
				title: notices.title,
				body: notices.body,
				status: notices.status,
			})
			.from(notices)
			.where(eq(notices.id, noticeId))
			.limit(1);
		if (!notice) return null;
		const recipients = await this.database.db
			.select({
				guardianId: guardians.id,
				phone: guardians.phone,
				language: guardians.preferredLanguage,
			})
			.from(noticeRecipients)
			.innerJoin(guardians, eq(guardians.id, noticeRecipients.guardianId))
			.where(and(eq(noticeRecipients.noticeId, noticeId), isNull(guardians.deletedAt)));
		return { notice, recipients };
	}

	/** True when the guardian wrote to the school on WhatsApp in the last 24 hours (free text allowed). */
	async hasOpenWhatsAppWindow(guardianId: string, since: Date) {
		const [row] = await this.database.db
			.select({ id: messages.id })
			.from(messages)
			.innerJoin(messageThreads, eq(messageThreads.id, messages.threadId))
			.where(
				and(
					eq(messageThreads.guardianId, guardianId),
					eq(messages.direction, 'from_family'),
					eq(messages.channel, 'whatsapp'),
					gte(messages.createdAt, since),
				),
			)
			.limit(1);
		return Boolean(row);
	}

	async insert(rows: (typeof messageDeliveries.$inferInsert)[]) {
		if (rows.length === 0) return [];
		const saved = [];
		for (let index = 0; index < rows.length; index += 500) {
			const chunk = rows.slice(index, index + 500);
			// oxlint-disable-next-line no-await-in-loop -- chunks keep each insert under the parameter limit
			const inserted = await this.database.db.insert(messageDeliveries).values(chunk).returning();
			saved.push(...inserted);
		}
		return saved;
	}

	/**
	 * Claims due deliveries by pushing their `not_before` past a lease, so a second worker skips
	 * them and a crashed one's claims come back after the lease.
	 */
	async claimDue(limit: number, now: Date, leaseMs: number) {
		const due = this.database.db
			.select({ id: messageDeliveries.id })
			.from(messageDeliveries)
			.where(and(eq(messageDeliveries.status, 'queued'), lte(messageDeliveries.notBefore, now)))
			.orderBy(messageDeliveries.notBefore)
			.limit(limit)
			.for('update', { skipLocked: true });
		return this.database.db
			.update(messageDeliveries)
			.set({
				notBefore: new Date(now.getTime() + leaseMs),
				attempts: sql`${messageDeliveries.attempts} + 1`,
				updatedAt: now,
			})
			.where(inArray(messageDeliveries.id, due))
			.returning();
	}

	async update(id: string, patch: Partial<typeof messageDeliveries.$inferInsert>) {
		const [row] = await this.database.db
			.update(messageDeliveries)
			.set({ ...patch, updatedAt: new Date() })
			.where(eq(messageDeliveries.id, id))
			.returning();
		return row ?? null;
	}

	/** Applies a provider receipt; ignores receipts that would move a delivery backwards. */
	async applyReceipt(
		providerMessageId: string,
		status: 'sent' | 'delivered' | 'read' | 'failed',
		at: Date,
		error?: string,
	) {
		const [row] = await this.database.db
			.select()
			.from(messageDeliveries)
			.where(eq(messageDeliveries.providerMessageId, providerMessageId))
			.limit(1);
		if (!row) return null;
		if (STATUS_RANK[status] < STATUS_RANK[row.status] && status !== 'failed')
			return { row, changed: false };
		if (status === 'failed' && STATUS_RANK[row.status] >= STATUS_RANK.delivered)
			return { row, changed: false };
		const patch: Partial<typeof messageDeliveries.$inferInsert> = { status };
		if (status === 'delivered') patch.deliveredAt = at;
		if (status === 'read') {
			patch.readAt = at;
			patch.deliveredAt = row.deliveredAt ?? at;
		}
		if (status === 'failed') patch.error = error ?? 'Delivery failed';
		const updated = await this.update(row.id, patch);
		return { row: updated ?? row, changed: true };
	}

	/** A message read on WhatsApp counts as read in the thread too. */
	async markMessageRead(messageId: string, at: Date) {
		await this.database.db
			.update(messages)
			.set({ status: 'read', readAt: at })
			.where(and(eq(messages.id, messageId), isNull(messages.readAt)));
	}

	/** The most recent delivery to a number: tells an inbound reply which school and thread it answers. */
	async findLatestToPhone(phone: string) {
		const [row] = await this.database.db
			.select()
			.from(messageDeliveries)
			.where(and(eq(messageDeliveries.toPhone, phone), eq(messageDeliveries.channel, 'whatsapp')))
			.orderBy(desc(messageDeliveries.createdAt))
			.limit(1);
		return row ?? null;
	}

	async findThreadForMessage(messageId: string) {
		const [row] = await this.database.db
			.select({ guardianId: messageThreads.guardianId, studentId: messageThreads.studentId })
			.from(messages)
			.innerJoin(messageThreads, eq(messageThreads.id, messages.threadId))
			.where(eq(messages.id, messageId))
			.limit(1);
		return row ?? null;
	}

	/** The guardian's most recent conversation, for a reply to a notice. */
	async findLatestThreadForGuardian(guardianId: string) {
		const [row] = await this.database.db
			.select({ guardianId: messageThreads.guardianId, studentId: messageThreads.studentId })
			.from(messageThreads)
			.where(eq(messageThreads.guardianId, guardianId))
			.orderBy(desc(messageThreads.lastMessageAt))
			.limit(1);
		return row ?? null;
	}

	/** A child of the guardian, to open a thread when a notice reply has none to join. */
	async findAnyChildOfGuardian(guardianId: string) {
		const [row] = await this.database.db
			.select({ studentId: studentGuardians.studentId })
			.from(studentGuardians)
			.where(eq(studentGuardians.guardianId, guardianId))
			.orderBy(desc(studentGuardians.isPrimary))
			.limit(1);
		return row?.studentId ?? null;
	}

	async findGuardian(guardianId: string) {
		const [row] = await this.database.db
			.select({ id: guardians.id, membershipId: guardians.membershipId })
			.from(guardians)
			.where(eq(guardians.id, guardianId))
			.limit(1);
		return row ?? null;
	}

	async countSince(tenantId: string, since: Date) {
		return this.database.db
			.select({
				channel: messageDeliveries.channel,
				status: messageDeliveries.status,
				count: sql<number>`count(*)::int`,
			})
			.from(messageDeliveries)
			.where(and(eq(messageDeliveries.tenantId, tenantId), gte(messageDeliveries.createdAt, since)))
			.groupBy(messageDeliveries.channel, messageDeliveries.status);
	}

	async recent(tenantId: string, limit: number) {
		return this.database.db
			.select()
			.from(messageDeliveries)
			.where(eq(messageDeliveries.tenantId, tenantId))
			.orderBy(desc(messageDeliveries.createdAt))
			.limit(limit);
	}
}
