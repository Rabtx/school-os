import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type { MembershipRecord, MessageDirection } from '@/database/schema';
import { AccessScopeService } from '@/modules/access-scope/access-scope.service';
import { hasManagementRole } from '@/modules/memberships/membership-roles';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import type { ListThreadsQuery, StartThreadInput } from './messages.dto';
import { MessagesRepository, type ThreadScope } from './messages.repository';

const THREAD_LIMIT = 100;
const MESSAGE_LIMIT = 200;
const RECIPIENT_LIMIT = 20;

/** Which side of the conversation the viewer is on. */
type Viewer =
	| { side: 'school'; membership: MembershipRecord; studentIds: 'all' | string[] }
	| { side: 'family'; membership: MembershipRecord; guardianIds: string[] };

type ThreadRow = NonNullable<Awaited<ReturnType<MessagesRepository['findThread']>>>;

export type ThreadView = {
	id: string;
	guardian: {
		id: string;
		name: string;
		relationship: string | null;
		/** Without an app account, messages wait for WhatsApp delivery. */
		hasAppAccount: boolean;
	};
	student: { id: string; name: string; sectionName: string | null };
	needsReply: boolean;
	unread: number;
	lastMessageAt: string;
	lastMessagePreview: string;
	lastMessageDirection: MessageDirection;
};

const fullName = (person: { firstName: string; lastName: string }) =>
	`${person.firstName} ${person.lastName}`.trim();

/**
 * Messages between the school and families. Staff see threads about the children they can see
 * (leadership: all; teachers: their sections); a guardian sees only their own threads, about
 * children linked to them.
 */
@Injectable()
export class MessagesService {
	constructor(
		private readonly messages: MessagesRepository,
		private readonly membershipAccess: MembershipsService,
		private readonly accessScope: AccessScopeService,
	) {}

	async listThreads(userId: string, tenantId: string, query: ListThreadsQuery) {
		const viewer = await this.resolveViewer(userId, tenantId);
		const rows = await this.messages.listThreads(tenantId, this.scopeOf(viewer), {
			needsReply: query.filter === 'needs_reply',
			search: query.search || undefined,
			limit: THREAD_LIMIT,
		});
		return { viewer: viewer.side, threads: rows.map(toThreadView) };
	}

	async getThread(userId: string, tenantId: string, threadId: string) {
		const viewer = await this.resolveViewer(userId, tenantId);
		const row = await this.requireThread(tenantId, threadId, viewer);
		// Opening the thread reads what the other side wrote.
		await this.messages.markRead(tenantId, threadId, otherSide(viewer), new Date());
		const messageRows = await this.messages.listMessages(tenantId, threadId, MESSAGE_LIMIT);
		return {
			viewer: viewer.side,
			thread: { ...toThreadView(row), unread: 0 },
			messages: messageRows.map(({ message, senderName, delivery }) => ({
				id: message.id,
				direction: message.direction,
				body: message.body,
				channel: message.channel,
				status: message.status,
				readAt: message.readAt?.toISOString() ?? null,
				createdAt: message.createdAt.toISOString(),
				senderName,
				mine: message.senderMembershipId === viewer.membership.id,
				/** How it reached the family outside the app (WhatsApp or SMS), once delivery runs. */
				delivery,
			})),
		};
	}

	async startThread(userId: string, tenantId: string, input: StartThreadInput) {
		const viewer = await this.resolveViewer(userId, tenantId);
		let guardianId: string;
		if (viewer.side === 'family') {
			guardianId = await this.familyGuardianFor(tenantId, viewer, input.studentId);
		} else {
			if (!input.guardianId) {
				throw new BadRequestException({
					code: 'MESSAGE_GUARDIAN_REQUIRED',
					message: 'Choose which guardian to write to.',
				});
			}
			await this.accessScope.requireStudentAccess(tenantId, viewer.membership, input.studentId);
			if (!(await this.messages.isLinked(tenantId, input.guardianId, input.studentId))) {
				throw new NotFoundException({ code: 'GUARDIAN_NOT_FOUND', message: 'Guardian not found' });
			}
			guardianId = input.guardianId;
		}
		const sent = await this.messages.send({
			tenantId,
			guardianId,
			studentId: input.studentId,
			direction: viewer.side === 'school' ? 'to_family' : 'from_family',
			senderMembershipId: viewer.membership.id,
			body: input.body,
		});
		return this.getThread(userId, tenantId, sent.threadId);
	}

	async reply(userId: string, tenantId: string, threadId: string, body: string) {
		const viewer = await this.resolveViewer(userId, tenantId);
		const row = await this.requireThread(tenantId, threadId, viewer);
		await this.messages.send({
			tenantId,
			guardianId: row.guardian.id,
			studentId: row.student.id,
			direction: viewer.side === 'school' ? 'to_family' : 'from_family',
			senderMembershipId: viewer.membership.id,
			body,
		});
		return this.getThread(userId, tenantId, threadId);
	}

	/** Guardians of the children a staff member can see, for starting a conversation. */
	async listRecipients(userId: string, tenantId: string, search: string) {
		const viewer = await this.resolveViewer(userId, tenantId);
		if (viewer.side === 'family') return { recipients: [] };
		const rows = await this.messages.listRecipients(
			tenantId,
			viewer.studentIds,
			search,
			RECIPIENT_LIMIT,
		);
		return {
			recipients: rows.map((row) => ({
				guardianId: row.guardianId,
				guardianName: `${row.guardianFirstName} ${row.guardianLastName}`.trim(),
				relationship: row.relationship,
				hasAppAccount: row.hasAppAccount,
				studentId: row.studentId,
				studentName: `${row.studentFirstName} ${row.studentLastName}`.trim(),
				sectionName: row.sectionName,
			})),
		};
	}

	/**
	 * A guardian replied on WhatsApp: it joins their thread about that child as a family message.
	 * Called by delivery, which already matched the number to the guardian.
	 */
	async receiveFromFamily(input: {
		tenantId: string;
		guardianId: string;
		studentId: string;
		guardianMembershipId: string | null;
		body: string;
	}) {
		return this.messages.send({
			tenantId: input.tenantId,
			guardianId: input.guardianId,
			studentId: input.studentId,
			direction: 'from_family',
			senderMembershipId: input.guardianMembershipId,
			body: input.body,
			channel: 'whatsapp',
		});
	}

	/** For the sidebar count; the caller scopes it to leadership. */
	countNeedsReply(tenantId: string) {
		return this.messages.countNeedsReply(tenantId);
	}

	/** Staff (leadership or teachers) answer for the school; a parent-only member is family. */
	private async resolveViewer(userId: string, tenantId: string): Promise<Viewer> {
		const membership = await this.membershipAccess.requireActiveMembership(userId, tenantId);
		const roles = await this.membershipAccess.listRoleCodes(membership.id, membership.role);
		if (hasManagementRole(roles) || roles.includes('teacher')) {
			return {
				side: 'school',
				membership,
				studentIds: await this.accessScope.listAccessibleStudentIds(tenantId, membership),
			};
		}
		if (roles.includes('parent')) {
			return {
				side: 'family',
				membership,
				guardianIds: await this.messages.listGuardianIdsForMembership(tenantId, membership.id),
			};
		}
		throw new NotFoundException({
			code: 'MESSAGES_NOT_AVAILABLE',
			message: 'Messages are not available for your role',
		});
	}

	private scopeOf(viewer: Viewer): ThreadScope {
		return viewer.side === 'school'
			? { studentIds: viewer.studentIds, unreadDirection: 'from_family' }
			: { studentIds: 'all', guardianIds: viewer.guardianIds, unreadDirection: 'to_family' };
	}

	/** Out-of-scope threads read as not found, like another school's. */
	private async requireThread(tenantId: string, threadId: string, viewer: Viewer) {
		const row = await this.messages.findThread(tenantId, threadId, otherSide(viewer));
		const allowed =
			row &&
			(viewer.side === 'school'
				? viewer.studentIds === 'all' || viewer.studentIds.includes(row.student.id)
				: viewer.guardianIds.includes(row.guardian.id) &&
					(await this.messages.isLinked(tenantId, row.guardian.id, row.student.id)));
		if (!row || !allowed) {
			throw new NotFoundException({
				code: 'MESSAGE_THREAD_NOT_FOUND',
				message: 'Conversation not found',
			});
		}
		return row;
	}

	/** A parent writes as the guardian profile linked to that child. */
	private async familyGuardianFor(
		tenantId: string,
		viewer: Extract<Viewer, { side: 'family' }>,
		studentId: string,
	) {
		for (const guardianId of viewer.guardianIds) {
			// oxlint-disable-next-line no-await-in-loop -- a parent has one or two guardian profiles
			if (await this.messages.isLinked(tenantId, guardianId, studentId)) return guardianId;
		}
		throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Student not found' });
	}
}

function otherSide(viewer: Viewer): MessageDirection {
	return viewer.side === 'school' ? 'from_family' : 'to_family';
}

function toThreadView(row: ThreadRow): ThreadView {
	return {
		id: row.thread.id,
		guardian: {
			id: row.guardian.id,
			name: fullName(row.guardian),
			relationship: row.relationship,
			hasAppAccount: row.guardian.membershipId !== null,
		},
		student: { id: row.student.id, name: fullName(row.student), sectionName: row.sectionName },
		needsReply: row.thread.needsReply,
		unread: row.unread,
		lastMessageAt: row.thread.lastMessageAt.toISOString(),
		lastMessagePreview: row.thread.lastMessagePreview,
		lastMessageDirection: row.thread.lastMessageDirection,
	};
}
