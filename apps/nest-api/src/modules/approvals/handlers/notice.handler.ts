import { Injectable } from '@nestjs/common';
import * as z from 'zod';

import type { NoticeAudience } from '@/database/schema';
import { NoticesService } from '@/modules/notices/notices.service';
import type { ApprovalHandler } from '../approval-handler';
import { UNDO_WINDOW_MS } from '../approval-constants';

const inputSchema = z.object({ noticeId: z.string().uuid() }).strict();
type Input = z.infer<typeof inputSchema>;

export type NoticePayload = Input & {
	title: string;
	body: string;
	audience: NoticeAudience;
	audienceLabel: string;
	reach: { parents: number; parentsOnApp: number; staff: number; total: number };
};

/** A notice waiting more than a week is stale; it goes back to its author as a draft. */
const EXPIRES_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

function people(count: number, one: string, many: string) {
	return `${count} ${count === 1 ? one : many}`;
}

/**
 * A teacher's notice goes to leadership before it reaches families. Approving sends it to the
 * audience as it is then; undo takes it back before anyone is told (delivery waits out the window).
 */
@Injectable()
export class NoticeHandler implements ApprovalHandler<Input, NoticePayload> {
	readonly type = 'notice';
	readonly label = 'Notice';
	readonly inputSchema = inputSchema;

	constructor(private readonly notices: NoticesService) {}

	async prepare(context: { userId: string; tenantId: string }, input: Input) {
		const notice = await this.notices.submitForApproval(
			context.userId,
			context.tenantId,
			input.noticeId,
		);
		return {
			payload: { ...input, ...notice },
			dedupeKey: `notice:${input.noticeId}`,
			risk: notice.reach.total > 100 ? ('medium' as const) : ('low' as const),
			approverRole: 'leadership' as const,
			expiresAt: new Date(Date.now() + EXPIRES_AFTER_MS),
		};
	}

	describe(payload: NoticePayload) {
		const { reach } = payload;
		const notOnApp = reach.parents - reach.parentsOnApp;
		return {
			title: payload.title,
			subtitle: `${payload.audienceLabel} · ${people(reach.total, 'person', 'people')}`,
			quote: { label: 'Message preview', text: payload.body },
			facts: [
				{ label: 'Audience', value: payload.audienceLabel },
				...(reach.parents > 0
					? [
							{
								label: 'Parents',
								value: `${reach.parentsOnApp} on School OS${notOnApp > 0 ? `, ${notOnApp} by WhatsApp once connected` : ''}`,
							},
						]
					: []),
				...(reach.staff > 0
					? [{ label: 'Staff', value: people(reach.staff, 'person', 'people') }]
					: []),
			],
			outcome: `If you approve: the notice goes to ${people(reach.total, 'person', 'people')} and you can see who has read it.`,
			approveLabel: 'Approve and send',
			declineTitle: 'Say no to this notice?',
			declineReasons: ['Needs changes', 'Wrong audience', 'Not now', 'Other'],
		};
	}

	async apply(context: { tenantId: string; approver: { id: string } }, payload: NoticePayload) {
		const sent = await this.notices.sendApproved(
			context.tenantId,
			payload.noticeId,
			context.approver.id,
			new Date(Date.now() + UNDO_WINDOW_MS),
		);
		return {
			headline: `${payload.title} went to ${people(sent.recipients, 'person', 'people')}.`,
			facts: [
				{ label: 'Audience', value: payload.audienceLabel },
				{ label: 'In the app', value: 'Now, with read receipts' },
				{ label: 'WhatsApp', value: 'Once it is connected' },
			],
			undo: {},
		};
	}

	async undo(context: { tenantId: string; approver: { id: string } }, payload: NoticePayload) {
		await this.notices.unsend(context.tenantId, payload.noticeId, context.approver.id);
	}

	async release(context: { tenantId: string }, payload: NoticePayload) {
		await this.notices.backToDraft(context.tenantId, payload.noticeId);
	}

	expired(payload: NoticePayload) {
		return {
			summary: `Nobody decided within a week, so ${payload.title} was not sent.`,
			facts: [{ label: 'Notice', value: 'Not sent' }],
		};
	}

	declined(payload: NoticePayload, reason: string) {
		return `${payload.title} was not sent. Reason: ${reason}`;
	}
}
