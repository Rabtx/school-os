import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import type {
	MembershipRecord,
	NoticeAudience,
	NoticeRecord,
	NoticeStatus,
} from '@/database/schema';
import { hasManagementRole } from '@/modules/memberships/membership-roles';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { audienceLabel } from './notice-audience';
import type { ListNoticesQuery, NoticeDraftInput, UpdateNoticeInput } from './notices.dto';
import { NoticesRepository } from './notices.repository';

const LIST_LIMIT = 100;
const INBOX_LIMIT = 50;

/** Who is writing: leadership reaches anyone and sends directly; a teacher their own classes, via approval. */
type Author = { membership: MembershipRecord; leadership: boolean; sectionIds: 'all' | string[] };

type NoticeRow = NonNullable<Awaited<ReturnType<NoticesRepository['findById']>>>;

export type AudienceReach = { parents: number; parentsOnApp: number; staff: number; total: number };

@Injectable()
export class NoticesService {
	constructor(
		private readonly notices: NoticesRepository,
		private readonly membershipAccess: MembershipsService,
		private readonly staff: StaffRepository,
	) {}

	async list(userId: string, tenantId: string, query: ListNoticesQuery) {
		const author = await this.requireAuthor(userId, tenantId);
		const createdBy = author.leadership ? undefined : author.membership.id;
		const statuses: NoticeStatus[] =
			query.tab === 'sent' ? ['sent'] : ['draft', 'pending_approval'];
		const [rows, counts] = await Promise.all([
			this.notices.list(tenantId, { statuses, createdBy, limit: LIST_LIMIT }),
			this.notices.countByStatus(tenantId, createdBy),
		]);
		const count = (status: NoticeStatus) => counts.find((row) => row.status === status)?.count ?? 0;
		return {
			canSendDirectly: author.leadership,
			notices: await Promise.all(rows.map((row) => this.toView(tenantId, row))),
			totals: {
				sent: count('sent'),
				drafts: count('draft') + count('pending_approval'),
				notRead: rows.reduce((sum, row) => sum + (row.notice.recipientCount - row.readCount), 0),
			},
		};
	}

	async get(userId: string, tenantId: string, noticeId: string) {
		const author = await this.requireAuthor(userId, tenantId);
		const row = await this.requireOwnNotice(tenantId, noticeId, author);
		const view = await this.toView(tenantId, row);
		const reach =
			row.notice.status === 'sent' ? null : await this.reach(tenantId, row.notice.audience);
		return { ...view, canSendDirectly: author.leadership, reach };
	}

	async create(userId: string, tenantId: string, input: NoticeDraftInput) {
		const author = await this.requireAuthor(userId, tenantId);
		this.requireAudienceAllowed(author, input.audience);
		const notice = await this.notices.create({
			tenantId,
			title: input.title,
			body: input.body,
			audience: input.audience,
			createdByMembershipId: author.membership.id,
		});
		return this.get(userId, tenantId, notice.id);
	}

	async update(userId: string, tenantId: string, noticeId: string, input: UpdateNoticeInput) {
		const author = await this.requireAuthor(userId, tenantId);
		await this.requireOwnNotice(tenantId, noticeId, author);
		if (input.audience) this.requireAudienceAllowed(author, input.audience);
		const updated = await this.notices.update(tenantId, noticeId, ['draft'], input);
		if (!updated) throw notEditable();
		return this.get(userId, tenantId, noticeId);
	}

	async remove(userId: string, tenantId: string, noticeId: string) {
		const author = await this.requireAuthor(userId, tenantId);
		await this.requireOwnNotice(tenantId, noticeId, author);
		if (!(await this.notices.deleteDraft(tenantId, noticeId))) throw notEditable();
		return { deleted: true };
	}

	/** Leadership sends a draft now ("Approve and send"). */
	async sendNow(userId: string, tenantId: string, noticeId: string) {
		const author = await this.requireAuthor(userId, tenantId);
		if (!author.leadership) {
			throw new ForbiddenException({
				code: 'NOTICE_NEEDS_APPROVAL',
				message: 'Send this notice for approval; leadership sends it.',
			});
		}
		const row = await this.requireOwnNotice(tenantId, noticeId, author);
		const sent = await this.deliver(
			tenantId,
			row.notice,
			['draft'],
			author.membership.id,
			new Date(),
		);
		if (!sent) throw notEditable();
		return this.get(userId, tenantId, noticeId);
	}

	/** How many people an audience reaches now, for the composer and the approval card. */
	async previewAudience(userId: string, tenantId: string, audience: NoticeAudience) {
		const author = await this.requireAuthor(userId, tenantId);
		this.requireAudienceAllowed(author, audience);
		return {
			label: await this.labelFor(tenantId, audience),
			reach: await this.reach(tenantId, audience),
		};
	}

	/** The classes this author may address, with family counts. */
	async audienceOptions(userId: string, tenantId: string) {
		const author = await this.requireAuthor(userId, tenantId);
		return {
			canReachEveryone: author.leadership,
			sections: await this.notices.sectionOptions(tenantId, author.sectionIds),
		};
	}

	async inbox(userId: string, tenantId: string) {
		const membership = await this.membershipAccess.requireActiveMembership(userId, tenantId);
		const rows = await this.notices.inbox(tenantId, membership.id, INBOX_LIMIT);
		return {
			notices: rows.map((row) => ({
				id: row.notice.id,
				title: row.notice.title,
				body: row.notice.body,
				sentAt: row.notice.sentAt?.toISOString() ?? null,
				from: row.authorName,
				readAt: row.readAt?.toISOString() ?? null,
			})),
		};
	}

	async markRead(userId: string, tenantId: string, noticeId: string) {
		const membership = await this.membershipAccess.requireActiveMembership(userId, tenantId);
		await this.notices.markRead(tenantId, noticeId, membership.id);
		return { read: true };
	}

	// --- For the approvals engine (notice type). No permission checks beyond the author's. ---

	/** A teacher (or leader) asks to send their draft; it locks while it waits. */
	async submitForApproval(userId: string, tenantId: string, noticeId: string) {
		const author = await this.requireAuthor(userId, tenantId);
		const row = await this.requireOwnNotice(tenantId, noticeId, author);
		this.requireAudienceAllowed(author, row.notice.audience);
		const locked = await this.notices.update(tenantId, noticeId, ['draft', 'pending_approval'], {
			status: 'pending_approval',
		});
		if (!locked) throw notEditable();
		return {
			title: locked.title,
			body: locked.body,
			audience: locked.audience,
			audienceLabel: await this.labelFor(tenantId, locked.audience),
			reach: await this.reach(tenantId, locked.audience),
		};
	}

	async sendApproved(tenantId: string, noticeId: string, approverId: string, deliverAfter: Date) {
		const row = await this.notices.findById(tenantId, noticeId);
		if (!row)
			throw new NotFoundException({ code: 'NOTICE_NOT_FOUND', message: 'Notice not found' });
		const sent = await this.deliver(
			tenantId,
			row.notice,
			['pending_approval'],
			approverId,
			deliverAfter,
		);
		if (!sent) {
			throw new ConflictException({
				code: 'NOTICE_NOT_PENDING',
				message: 'This notice is no longer waiting to be sent.',
			});
		}
		return { recipients: sent.recipientCount };
	}

	unsend(tenantId: string, noticeId: string, actorId: string) {
		return this.notices.unsend(tenantId, noticeId, actorId);
	}

	/** Declined or withdrawn: back to a draft the author can change and resend. */
	async backToDraft(tenantId: string, noticeId: string) {
		await this.notices.update(tenantId, noticeId, ['pending_approval'], { status: 'draft' });
	}

	private async deliver(
		tenantId: string,
		notice: NoticeRecord,
		from: NoticeStatus[],
		senderId: string,
		deliverAfter: Date,
	) {
		const recipients = await this.notices.resolveRecipients(tenantId, notice.audience);
		if (recipients.guardians.length + recipients.staff.length === 0) {
			throw new BadRequestException({
				code: 'NOTICE_NO_RECIPIENTS',
				message: 'Nobody is in this audience yet.',
			});
		}
		return this.notices.send({
			tenantId,
			noticeId: notice.id,
			from,
			sentByMembershipId: senderId,
			recipients,
			deliverAfter,
		});
	}

	private async reach(tenantId: string, audience: NoticeAudience): Promise<AudienceReach> {
		const recipients = await this.notices.resolveRecipients(tenantId, audience);
		const parentsOnApp = recipients.guardians.filter((row) => row.membershipId).length;
		const guardianMemberships = new Set(recipients.guardians.map((row) => row.membershipId));
		const staff = recipients.staff.filter(
			(row) => !guardianMemberships.has(row.membershipId),
		).length;
		return {
			parents: recipients.guardians.length,
			parentsOnApp,
			staff,
			total: recipients.guardians.length + staff,
		};
	}

	private async labelFor(tenantId: string, audience: NoticeAudience) {
		if (audience.kind !== 'sections') return audienceLabel(audience);
		const names = await this.notices.sectionNames(tenantId, audience.sectionIds);
		return audienceLabel(audience, names.map((row) => row.name).toSorted());
	}

	private async toView(tenantId: string, row: NoticeRow) {
		return {
			id: row.notice.id,
			title: row.notice.title,
			body: row.notice.body,
			audience: row.notice.audience,
			audienceLabel: await this.labelFor(tenantId, row.notice.audience),
			status: row.notice.status,
			author: row.authorName,
			createdAt: row.notice.createdAt.toISOString(),
			sentAt: row.notice.sentAt?.toISOString() ?? null,
			recipientCount: row.notice.recipientCount,
			readCount: row.readCount,
			onAppCount: row.onAppCount,
		};
	}

	private async requireAuthor(userId: string, tenantId: string): Promise<Author> {
		const membership = await this.membershipAccess.requireActiveMembership(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		if (hasManagementRole(roles)) return { membership, leadership: true, sectionIds: 'all' };
		if (roles.includes('teacher')) {
			return {
				membership,
				leadership: false,
				sectionIds: await this.staff.listTeacherAssignedSectionIds(tenantId, membership.id),
			};
		}
		throw new ForbiddenException({
			code: 'NOTICES_FORBIDDEN',
			message: 'Only staff can write notices.',
		});
	}

	/** Leadership sees every notice; a teacher only their own. Others read as not found. */
	private async requireOwnNotice(tenantId: string, noticeId: string, author: Author) {
		const row = await this.notices.findById(tenantId, noticeId);
		if (!row || (!author.leadership && row.notice.createdByMembershipId !== author.membership.id)) {
			throw new NotFoundException({ code: 'NOTICE_NOT_FOUND', message: 'Notice not found' });
		}
		return row;
	}

	/** Teachers write to the parents of their own classes; only leadership reaches everyone. */
	private requireAudienceAllowed(author: Author, audience: NoticeAudience) {
		if (author.leadership) return;
		const allowed =
			audience.kind === 'sections' &&
			author.sectionIds !== 'all' &&
			audience.sectionIds.every((id) => (author.sectionIds as string[]).includes(id));
		if (!allowed) {
			throw new ForbiddenException({
				code: 'NOTICE_AUDIENCE_FORBIDDEN',
				message: 'You can write to the parents of your own classes.',
			});
		}
	}
}

function notEditable() {
	return new ConflictException({
		code: 'NOTICE_NOT_EDITABLE',
		message: 'This notice was already sent or is waiting for approval.',
	});
}
