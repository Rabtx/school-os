import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	guardians,
	type MessageChannel,
	type MessageDirection,
	messages,
	messageThreads,
	outboxEvents,
	studentGuardians,
	students,
} from '@/database/schema';

/** The student's current class name, e.g. "7-B", from their active enrollment. */
const sectionName = sql<string | null>`(
	select s.name from enrollments e
	join sections s on s.id = e.section_id
	where e.student_id = ${students.id} and e.status = 'active' and e.deleted_at is null
	order by e.enrolled_on desc
	limit 1
)`;

/** A staff or guardian member's display name, or their username. */
const senderName = sql<string | null>`(
	select coalesce(nullif(up.display_name, ''), u.username)
	from memberships m
	join users u on u.id = m.user_id
	left join user_profiles up on up.user_id = u.id
	where m.id = "messages"."sender_membership_id"
)`;

/** How a message to a family went out of the app: the newest WhatsApp or SMS attempt. */
const latestDelivery = sql<{ channel: string; status: string } | null>`(
	select json_build_object('channel', d.channel, 'status', d.status)
	from message_deliveries d
	where d.source_type = 'message' and d.source_id = "messages"."id"
	order by d.created_at desc
	limit 1
)`;

export type ThreadScope = {
	/** `'all'` for leadership, otherwise the students the viewer can see. */
	studentIds: 'all' | string[];
	/** Set for a guardian: only their own threads. */
	guardianIds?: string[];
	/** Which side's unread messages to count: the viewer reads the other side's. */
	unreadDirection: MessageDirection;
};

@Injectable()
export class MessagesRepository {
	constructor(private readonly database: DatabaseService) {}

	private threadSelection(unreadDirection: MessageDirection) {
		return {
			thread: messageThreads,
			guardian: {
				id: guardians.id,
				firstName: guardians.firstName,
				lastName: guardians.lastName,
				membershipId: guardians.membershipId,
				phone: guardians.phone,
			},
			student: {
				id: students.id,
				firstName: students.firstName,
				lastName: students.lastName,
			},
			sectionName,
			relationship: sql<string | null>`(
				select sg.relationship from student_guardians sg
				where sg.guardian_id = ${guardians.id} and sg.student_id = ${students.id}
				limit 1
			)`,
			unread: sql<number>`(
				select count(*)::int from messages mm
				where mm.thread_id = ${messageThreads.id}
					and mm.direction = ${unreadDirection}
					and mm.read_at is null
			)`,
		};
	}

	private threadQuery(unreadDirection: MessageDirection) {
		return this.database.db
			.select(this.threadSelection(unreadDirection))
			.from(messageThreads)
			.innerJoin(guardians, eq(guardians.id, messageThreads.guardianId))
			.innerJoin(students, eq(students.id, messageThreads.studentId));
	}

	async listThreads(
		tenantId: string,
		scope: ThreadScope,
		filters: { needsReply?: boolean; search?: string; limit: number },
	) {
		if (scope.studentIds !== 'all' && scope.studentIds.length === 0) return [];
		if (scope.guardianIds && scope.guardianIds.length === 0) return [];
		const conditions: SQL[] = [
			eq(messageThreads.tenantId, tenantId),
			isNull(students.deletedAt),
			isNull(guardians.deletedAt),
		];
		if (scope.studentIds !== 'all') {
			conditions.push(inArray(messageThreads.studentId, scope.studentIds));
		}
		if (scope.guardianIds) conditions.push(inArray(messageThreads.guardianId, scope.guardianIds));
		if (filters.needsReply) conditions.push(eq(messageThreads.needsReply, true));
		if (filters.search) {
			const term = `%${filters.search}%`;
			const match = or(
				ilike(guardians.firstName, term),
				ilike(guardians.lastName, term),
				ilike(students.firstName, term),
				ilike(students.lastName, term),
				ilike(messageThreads.lastMessagePreview, term),
			);
			if (match) conditions.push(match);
		}
		return this.threadQuery(scope.unreadDirection)
			.where(and(...conditions))
			.orderBy(desc(messageThreads.lastMessageAt))
			.limit(filters.limit);
	}

	async findThread(tenantId: string, threadId: string, unreadDirection: MessageDirection) {
		const [row] = await this.threadQuery(unreadDirection)
			.where(and(eq(messageThreads.tenantId, tenantId), eq(messageThreads.id, threadId)))
			.limit(1);
		return row ?? null;
	}

	async listMessages(tenantId: string, threadId: string, limit: number) {
		const rows = await this.database.db
			.select({ message: messages, senderName, delivery: latestDelivery })
			.from(messages)
			.where(and(eq(messages.tenantId, tenantId), eq(messages.threadId, threadId)))
			.orderBy(desc(messages.createdAt))
			.limit(limit);
		return rows.toReversed();
	}

	/** The viewer has seen the other side's messages. */
	async markRead(tenantId: string, threadId: string, direction: MessageDirection, now: Date) {
		await this.database.db
			.update(messages)
			.set({ status: 'read', readAt: now })
			.where(
				and(
					eq(messages.tenantId, tenantId),
					eq(messages.threadId, threadId),
					eq(messages.direction, direction),
					isNull(messages.readAt),
				),
			);
	}

	/**
	 * Adds a message, opening the guardian and child's thread if it does not exist yet. One
	 * transaction updates the thread summary and queues `messages.sent.v1` for delivery (WhatsApp
	 * once connected).
	 */
	async send(input: {
		tenantId: string;
		guardianId: string;
		studentId: string;
		direction: MessageDirection;
		/** Null for a WhatsApp reply from a guardian without an app account. */
		senderMembershipId: string | null;
		body: string;
		channel?: MessageChannel;
	}) {
		return this.database.db.transaction(async (transaction) => {
			const now = new Date();
			await transaction
				.insert(messageThreads)
				.values({
					tenantId: input.tenantId,
					guardianId: input.guardianId,
					studentId: input.studentId,
				})
				.onConflictDoNothing();
			const [thread] = await transaction
				.select()
				.from(messageThreads)
				.where(
					and(
						eq(messageThreads.tenantId, input.tenantId),
						eq(messageThreads.guardianId, input.guardianId),
						eq(messageThreads.studentId, input.studentId),
					),
				)
				.limit(1);
			if (!thread) throw new Error('Message thread upsert returned no row');

			const [message] = await transaction
				.insert(messages)
				.values({
					tenantId: input.tenantId,
					threadId: thread.id,
					direction: input.direction,
					senderMembershipId: input.senderMembershipId,
					body: input.body,
					channel: input.channel ?? 'app',
					createdAt: now,
				})
				.returning();
			if (!message) throw new Error('Message insert returned no row');

			await transaction
				.update(messageThreads)
				.set({
					lastMessageAt: now,
					lastMessagePreview: input.body.replace(/\s+/g, ' ').slice(0, 200),
					lastMessageDirection: input.direction,
					needsReply: input.direction === 'from_family',
					updatedAt: now,
				})
				.where(eq(messageThreads.id, thread.id));
			// Replying from the school also marks what the family wrote as seen.
			if (input.direction === 'to_family') {
				await transaction
					.update(messages)
					.set({ status: 'read', readAt: now })
					.where(
						and(
							eq(messages.threadId, thread.id),
							eq(messages.direction, 'from_family'),
							isNull(messages.readAt),
						),
					);
			}
			await transaction.insert(outboxEvents).values({
				tenantId: input.tenantId,
				eventType: 'messages.sent.v1',
				aggregateType: 'message',
				aggregateId: message.id,
				payload: {
					tenantId: input.tenantId,
					threadId: thread.id,
					messageId: message.id,
					direction: input.direction,
					guardianId: input.guardianId,
					studentId: input.studentId,
				},
				status: 'pending',
			});
			return { threadId: thread.id, message };
		});
	}

	/** Threads waiting on the school, for the sidebar count. */
	async countNeedsReply(tenantId: string) {
		const [row] = await this.database.db
			.select({ count: sql<number>`count(*)::int` })
			.from(messageThreads)
			.where(and(eq(messageThreads.tenantId, tenantId), eq(messageThreads.needsReply, true)));
		return row?.count ?? 0;
	}

	/** Guardians linked to the given students, for "New message" (Figma "New"). */
	async listRecipients(
		tenantId: string,
		studentIds: 'all' | string[],
		search: string,
		limit: number,
	) {
		if (studentIds !== 'all' && studentIds.length === 0) return [];
		const conditions: SQL[] = [
			eq(studentGuardians.tenantId, tenantId),
			isNull(guardians.deletedAt),
			isNull(students.deletedAt),
			eq(students.status, 'active'),
		];
		if (studentIds !== 'all') conditions.push(inArray(students.id, studentIds));
		if (search) {
			const term = `%${search}%`;
			const match = or(
				ilike(guardians.firstName, term),
				ilike(guardians.lastName, term),
				ilike(students.firstName, term),
				ilike(students.lastName, term),
			);
			if (match) conditions.push(match);
		}
		return this.database.db
			.select({
				guardianId: guardians.id,
				guardianFirstName: guardians.firstName,
				guardianLastName: guardians.lastName,
				hasAppAccount: sql<boolean>`${guardians.membershipId} is not null`,
				relationship: studentGuardians.relationship,
				studentId: students.id,
				studentFirstName: students.firstName,
				studentLastName: students.lastName,
				sectionName,
			})
			.from(studentGuardians)
			.innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
			.innerJoin(students, eq(students.id, studentGuardians.studentId))
			.where(and(...conditions))
			.orderBy(asc(students.firstName), asc(guardians.firstName))
			.limit(limit);
	}

	/** Is this guardian linked to this student? */
	async isLinked(tenantId: string, guardianId: string, studentId: string) {
		const [row] = await this.database.db
			.select({ id: studentGuardians.id })
			.from(studentGuardians)
			.where(
				and(
					eq(studentGuardians.tenantId, tenantId),
					eq(studentGuardians.guardianId, guardianId),
					eq(studentGuardians.studentId, studentId),
				),
			)
			.limit(1);
		return Boolean(row);
	}

	/** The guardian profiles a member signs in as (a parent may have one per school). */
	async listGuardianIdsForMembership(tenantId: string, membershipId: string) {
		const rows = await this.database.db
			.select({ id: guardians.id })
			.from(guardians)
			.where(
				and(
					eq(guardians.tenantId, tenantId),
					eq(guardians.membershipId, membershipId),
					isNull(guardians.deletedAt),
				),
			);
		return rows.map((row) => row.id);
	}
}
