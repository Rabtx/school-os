import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NoticesService } from '@/modules/notices/notices.service';
import { NoticeHandler } from './notice.handler';

const snapshot = {
	title: 'Trip form, Class 7',
	body: 'Please send the signed trip form by Friday.',
	audience: { kind: 'sections' as const, sectionIds: ['s'] },
	audienceLabel: 'Parents of 7-A',
	reach: { parents: 30, parentsOnApp: 12, staff: 0, total: 30 },
};

describe('NoticeHandler', () => {
	let notices: Record<string, ReturnType<typeof vi.fn>>;
	let handler: NoticeHandler;

	beforeEach(() => {
		notices = {
			submitForApproval: vi.fn(async () => snapshot),
			sendApproved: vi.fn(async () => ({ recipients: 30 })),
			unsend: vi.fn(async () => ({})),
			backToDraft: vi.fn(async () => undefined),
		};
		handler = new NoticeHandler(notices as unknown as NoticesService);
	});

	it('locks the draft and describes the message and reach', async () => {
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, { noticeId: 'n' });
		expect(prepared.dedupeKey).toBe('notice:n');
		const card = handler.describe(prepared.payload);
		expect(card.quote).toEqual({ label: 'Message preview', text: snapshot.body });
		expect(card.facts).toContainEqual({
			label: 'Parents',
			value: '12 on School OS, 18 by WhatsApp once connected',
		});
		expect(card.approveLabel).toBe('Approve and send');
	});

	it('flags large audiences', async () => {
		notices.submitForApproval.mockResolvedValue({
			...snapshot,
			reach: { ...snapshot.reach, total: 240 },
		});
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, { noticeId: 'n' });
		expect(prepared.risk).toBe('medium');
	});

	it('sends after the undo window, unsends on undo, and returns to draft when declined', async () => {
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, { noticeId: 'n' });
		const before = Date.now();
		const effect = await handler.apply({ tenantId: 't', approver: { id: 'p' } }, prepared.payload);
		const deliverAfter = notices.sendApproved.mock.calls[0]?.[3] as Date;
		expect(deliverAfter.getTime()).toBeGreaterThan(before);
		expect(effect.headline).toBe('Trip form, Class 7 went to 30 people.');
		await handler.undo({ tenantId: 't', approver: { id: 'p' } }, prepared.payload);
		expect(notices.unsend).toHaveBeenCalledWith('t', 'n', 'p');
		await handler.release({ tenantId: 't' }, prepared.payload);
		expect(notices.backToDraft).toHaveBeenCalledWith('t', 'n');
	});
});
