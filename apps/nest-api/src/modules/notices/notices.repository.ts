import { Injectable } from '@nestjs/common';
import { and, desc, eq, exists, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';

import { DatabaseService } from '@/database/database.service';
import {
	auditLogs,
	campuses,
	enrollments,
	guardians,
	membershipRoles,
	memberships,
	type NoticeAudience,
	type NoticeStatus,
	noticeRecipients,
	notices,
	outboxEvents,
	sections,
	studentGuardians,
	students,
} from '@/database/schema';
import { audienceIncludesParents, audienceIncludesStaff } from './notice-audience';

const STAFF_ROLES = ['owner', 'principal', 'vice_principal', 'admin', 'teacher'] as const;

export type Recipients = {
	guardians: { guardianId: string; membershipId: string | null }[];
	staff: { membershipId: string }[];
};

/** A notice with its author's name and how many recipients have read it. */
const noticeSelection = {
	notice: notices,
	authorName: sql<string | null>`(
		select coalesce(nullif(up.display_name, ''), u.username)
		from memberships m
		join users u on u.id = m.user_id
		left join user_profiles up on up.user_id = u.id
		where m.id = "notices"."created_by_membership_id"
	)`,
	readCount: sql<number>`(
		select count(*)::int from notice_recipients nr
		where nr.notice_id = "notices"."id" and nr.read_at is not null
	)`,
	onAppCount: sql<number>`(
		select count(*)::int from notice_recipients nr
		where nr.notice_id = "notices"."id" and nr.membership_id is not null
	)`,
};

@Injectable()
export class NoticesRepository {
	constructor(private readonly database: DatabaseService) {}

	async findById(tenantId: string, noticeId: string) {
		const [row] = await this.database.db
			.select(noticeSelection)
			.from(notices)
			.where(and(eq(notices.tenantId, tenantId), eq(notices.id, noticeId)))
			.limit(1);
		return row ?? null;
	}

	async list(
		tenantId: string,
		filters: { statuses: NoticeStatus[]; createdBy?: string; limit: number },
	) {
		const conditions: SQL[] = [
			eq(notices.tenantId, tenantId),
			inArray(notices.status, filters.statuses),
		];
		if (filters.createdBy) conditions.push(eq(notices.createdByMembershipId, filters.createdBy));
		return this.database.db
			.select(noticeSelection)
			.from(notices)
			.where(and(...conditions))
			.orderBy(desc(sql`coalesce(${notices.sentAt}, ${notices.updatedAt})`))
			.limit(filters.limit);
	}

	async countByStatus(tenantId: string, createdBy?: string) {
		const conditions: SQL[] = [eq(notices.tenantId, tenantId)];
		if (createdBy) conditions.push(eq(notices.createdByMembershipId, createdBy));
		return this.database.db
			.select({ status: notices.status, count: sql<number>`count(*)::int` })
			.from(notices)
			.where(and(...conditions))
			.groupBy(notices.status);
	}

	async create(values: typeof notices.$inferInsert) {
		const [row] = await this.database.db.insert(notices).values(values).returning();
		if (!row) throw new Error('Notice insert returned no row');
		return row;
	}

	/** Changes a notice only while it is in one of `from`; null when it moved on meanwhile. */
	async update(
		tenantId: string,
		noticeId: string,
		from: NoticeStatus[],
		patch: Partial<typeof notices.$inferInsert>,
	) {
		const [row] = await this.database.db
			.update(notices)
			.set({ ...patch, updatedAt: new Date() })
			.where(
				and(
					eq(notices.tenantId, tenantId),
					eq(notices.id, noticeId),
					inArray(notices.status, from),
				),
			)
			.returning();
		return row ?? null;
	}

	async deleteDraft(tenantId: string, noticeId: string) {
		const [row] = await this.database.db
			.delete(notices)
			.where(
				and(eq(notices.tenantId, tenantId), eq(notices.id, noticeId), eq(notices.status, 'draft')),
			)
			.returning({ id: notices.id });
		return Boolean(row);
	}

	/** Everyone a notice would reach now. Guardians once each, however many children they have. */
	async resolveRecipients(tenantId: string, audience: NoticeAudience): Promise<Recipients> {
		const [guardianRows, staffRows] = await Promise.all([
			audienceIncludesParents(audience) ? this.audienceGuardians(tenantId, audience) : [],
			audienceIncludesStaff(audience) ? this.staffMemberships(tenantId) : [],
		]);
		return { guardians: guardianRows, staff: staffRows };
	}

	private audienceGuardians(tenantId: string, audience: NoticeAudience) {
		const conditions: SQL[] = [
			eq(studentGuardians.tenantId, tenantId),
			isNull(guardians.deletedAt),
			isNull(students.deletedAt),
			eq(students.status, 'active'),
			eq(enrollments.status, 'active'),
			isNull(enrollments.deletedAt),
		];
		if (audience.kind === 'sections')
			conditions.push(inArray(enrollments.sectionId, audience.sectionIds));
		return this.database.db
			.selectDistinct({ guardianId: guardians.id, membershipId: guardians.membershipId })
			.from(studentGuardians)
			.innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
			.innerJoin(students, eq(students.id, studentGuardians.studentId))
			.innerJoin(enrollments, eq(enrollments.studentId, students.id))
			.where(and(...conditions));
	}

	private staffMemberships(tenantId: string) {
		return this.database.db
			.select({ membershipId: memberships.id })
			.from(memberships)
			.where(
				and(
					eq(memberships.tenantId, tenantId),
					eq(memberships.status, 'active'),
					or(
						inArray(memberships.role, [...STAFF_ROLES]),
						exists(
							this.database.db
								.select({ one: sql`1` })
								.from(membershipRoles)
								.where(
									and(
										eq(membershipRoles.membershipId, memberships.id),
										inArray(membershipRoles.role, [...STAFF_ROLES]),
									),
								),
						),
					),
				),
			);
	}

	/** Sections by id, for audience labels. */
	async sectionNames(tenantId: string, sectionIds: string[]) {
		if (sectionIds.length === 0) return [];
		return this.database.db
			.select({ id: sections.id, name: sections.name })
			.from(sections)
			.where(
				and(
					eq(sections.tenantId, tenantId),
					inArray(sections.id, sectionIds),
					isNull(sections.deletedAt),
				),
			);
	}

	/** Classes a notice can target, with how many families each reaches. */
	async sectionOptions(tenantId: string, sectionIds: 'all' | string[]) {
		if (sectionIds !== 'all' && sectionIds.length === 0) return [];
		const conditions: SQL[] = [eq(sections.tenantId, tenantId), isNull(sections.deletedAt)];
		if (sectionIds !== 'all') conditions.push(inArray(sections.id, sectionIds));
		return this.database.db
			.select({
				id: sections.id,
				name: sections.name,
				campusName: campuses.name,
				families: sql<number>`(
					select count(distinct sg.guardian_id)::int
					from enrollments e
					join student_guardians sg on sg.student_id = e.student_id
					join guardians g on g.id = sg.guardian_id and g.deleted_at is null
					where e.section_id = ${sections.id} and e.status = 'active' and e.deleted_at is null
				)`,
			})
			.from(sections)
			.innerJoin(campuses, eq(campuses.id, sections.campusId))
			.where(and(...conditions))
			.orderBy(sections.name, campuses.name);
	}

	/**
	 * Sends: fixes the recipients, marks the notice sent and queues `notices.sent.v1` for delivery.
	 * `deliverAfter` lets the delivery worker wait out the approval's undo window.
	 */
	async send(input: {
		tenantId: string;
		noticeId: string;
		from: NoticeStatus[];
		sentByMembershipId: string;
		recipients: Recipients;
		deliverAfter: Date;
	}) {
		return this.database.db.transaction(async (transaction) => {
			const now = new Date();
			const guardianMemberships = new Set(
				input.recipients.guardians.map((row) => row.membershipId).filter(Boolean),
			);
			const rows: (typeof noticeRecipients.$inferInsert)[] = [
				...input.recipients.guardians.map((row) => ({
					tenantId: input.tenantId,
					noticeId: input.noticeId,
					guardianId: row.guardianId,
					membershipId: row.membershipId,
				})),
				// A staff member who is also a parent is reached once, as the parent.
				...input.recipients.staff
					.filter((row) => !guardianMemberships.has(row.membershipId))
					.map((row) => ({
						tenantId: input.tenantId,
						noticeId: input.noticeId,
						membershipId: row.membershipId,
					})),
			];
			const [sent] = await transaction
				.update(notices)
				.set({
					status: 'sent',
					sentAt: now,
					sentByMembershipId: input.sentByMembershipId,
					recipientCount: rows.length,
					updatedAt: now,
				})
				.where(
					and(
						eq(notices.tenantId, input.tenantId),
						eq(notices.id, input.noticeId),
						inArray(notices.status, input.from),
					),
				)
				.returning();
			if (!sent) return null;
			// Large schools: insert in chunks to stay under the parameter limit.
			for (let index = 0; index < rows.length; index += 1000) {
				// oxlint-disable-next-line no-await-in-loop -- chunks share one transaction connection
				await transaction.insert(noticeRecipients).values(rows.slice(index, index + 1000));
			}
			await transaction.insert(auditLogs).values({
				tenantId: input.tenantId,
				actorMembershipId: input.sentByMembershipId,
				action: 'notices.sent',
				resourceType: 'notice',
				resourceId: input.noticeId,
				metadata: { recipients: rows.length },
			});
			await transaction.insert(outboxEvents).values({
				tenantId: input.tenantId,
				eventType: 'notices.sent.v1',
				aggregateType: 'notice',
				aggregateId: input.noticeId,
				payload: {
					tenantId: input.tenantId,
					noticeId: input.noticeId,
					recipients: rows.length,
					deliverAfter: input.deliverAfter.toISOString(),
				},
				status: 'pending',
			});
			return sent;
		});
	}

	/** Undoes a send inside the approval's undo window: nobody keeps it. */
	async unsend(tenantId: string, noticeId: string, actorMembershipId: string) {
		return this.database.db.transaction(async (transaction) => {
			await transaction
				.delete(noticeRecipients)
				.where(
					and(eq(noticeRecipients.tenantId, tenantId), eq(noticeRecipients.noticeId, noticeId)),
				);
			const [row] = await transaction
				.update(notices)
				.set({
					status: 'pending_approval',
					sentAt: null,
					sentByMembershipId: null,
					recipientCount: 0,
					updatedAt: new Date(),
				})
				.where(
					and(eq(notices.tenantId, tenantId), eq(notices.id, noticeId), eq(notices.status, 'sent')),
				)
				.returning();
			await transaction.insert(auditLogs).values({
				tenantId,
				actorMembershipId,
				action: 'notices.unsent',
				resourceType: 'notice',
				resourceId: noticeId,
			});
			return row ?? null;
		});
	}

	/** Notices that reached this member, as a staff member or through their guardian profile. */
	async inbox(tenantId: string, membershipId: string, limit: number) {
		return this.database.db
			.select({
				notice: notices,
				readAt: noticeRecipients.readAt,
				authorName: noticeSelection.authorName,
			})
			.from(noticeRecipients)
			.innerJoin(notices, eq(notices.id, noticeRecipients.noticeId))
			.where(
				and(
					eq(noticeRecipients.tenantId, tenantId),
					eq(notices.status, 'sent'),
					this.reachesMember(membershipId),
				),
			)
			.orderBy(desc(notices.sentAt))
			.limit(limit);
	}

	async markRead(tenantId: string, noticeId: string, membershipId: string) {
		const rows = await this.database.db
			.update(noticeRecipients)
			.set({ readAt: new Date() })
			.where(
				and(
					eq(noticeRecipients.tenantId, tenantId),
					eq(noticeRecipients.noticeId, noticeId),
					isNull(noticeRecipients.readAt),
					this.reachesMember(membershipId),
				),
			)
			.returning({ id: noticeRecipients.id });
		return rows.length;
	}

	async countUnread(tenantId: string, membershipId: string) {
		const [row] = await this.database.db
			.select({ count: sql<number>`count(*)::int` })
			.from(noticeRecipients)
			.where(
				and(
					eq(noticeRecipients.tenantId, tenantId),
					isNull(noticeRecipients.readAt),
					this.reachesMember(membershipId),
				),
			);
		return row?.count ?? 0;
	}

	/** The row is this member's: addressed to them, or to a guardian profile they sign in as. */
	private reachesMember(membershipId: string) {
		const condition = or(
			eq(noticeRecipients.membershipId, membershipId),
			inArray(
				noticeRecipients.guardianId,
				this.database.db
					.select({ id: guardians.id })
					.from(guardians)
					.where(and(eq(guardians.membershipId, membershipId), isNull(guardians.deletedAt))),
			),
		);
		if (!condition) throw new Error('Recipient condition is empty');
		return condition;
	}
}
