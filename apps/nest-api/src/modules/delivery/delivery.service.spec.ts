import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MessagesService } from '@/modules/messages/messages.service';
import type { RulesService } from '@/modules/rules/rules.service';
import type { DeliveryRepository } from './delivery.repository';
import { DeliveryService } from './delivery.service';
import {
	ProviderError,
	type SmsProvider,
	type WhatsAppProvider,
} from './providers/delivery-provider';

const NOON_KARACHI = new Date('2026-10-30T07:00:00Z');

function delivery(overrides: Record<string, unknown> = {}) {
	return {
		id: 'd1',
		tenantId: 't',
		sourceType: 'notice',
		sourceId: 'n1',
		guardianId: 'g1',
		toPhone: '923001234567',
		channel: 'whatsapp',
		template: 'school_notice',
		templateParams: ['Greenfield', 'Trip', 'Friday'],
		language: 'en',
		body: 'Greenfield notice: Trip\n\nFriday',
		status: 'queued',
		attempts: 1,
		deliveredAt: null,
		...overrides,
	};
}

describe('DeliveryService', () => {
	let repository: Record<string, ReturnType<typeof vi.fn>>;
	let whatsapp: Record<string, ReturnType<typeof vi.fn>> & Pick<WhatsAppProvider, 'name' | 'live'>;
	let sms: Record<string, ReturnType<typeof vi.fn>> & Pick<SmsProvider, 'name' | 'live'>;
	let messages: Record<string, ReturnType<typeof vi.fn>>;
	let service: DeliveryService;

	function build(live = false) {
		whatsapp = {
			name: live ? 'meta' : 'sandbox',
			live,
			sendTemplate: vi.fn(async () => ({ providerMessageId: 'wamid.1' })),
			sendText: vi.fn(async () => ({ providerMessageId: 'wamid.2' })),
		} as unknown as typeof whatsapp;
		sms = {
			name: 'sandbox',
			live: false,
			send: vi.fn(async () => ({ providerMessageId: 'sms.1' })),
		} as unknown as typeof sms;
		service = new DeliveryService(
			repository as unknown as DeliveryRepository,
			{
				getAttendancePolicy: vi.fn(async () => ({
					clock: { timeZone: 'Asia/Karachi', quietHours: { start: '21:00', end: '07:00' } },
				})),
			} as unknown as RulesService,
			messages as unknown as MessagesService,
			whatsapp as unknown as WhatsAppProvider,
			sms as unknown as SmsProvider,
		);
	}

	beforeEach(() => {
		repository = {
			findChannel: vi.fn(async () => ({ status: 'connected' })),
			findPolicy: vi.fn(async () => ({ whatsappEnabled: true, smsFallbackEnabled: true })),
			findSchoolName: vi.fn(async () => 'Greenfield'),
			findNoticeForDelivery: vi.fn(async () => ({
				notice: { id: 'n1', tenantId: 't', title: 'Trip', body: 'Friday', status: 'sent' },
				recipients: [
					{ guardianId: 'g1', phone: '0300 1234567', language: 'en' },
					{ guardianId: 'g2', phone: null, language: 'ur' },
				],
			})),
			findMessageForDelivery: vi.fn(async () => ({
				messageId: 'm1',
				tenantId: 't',
				direction: 'to_family',
				body: 'Get well soon',
				threadId: 'th',
				guardianId: 'g1',
				phone: '03001234567',
				language: 'en',
				studentFirstName: 'Saad',
			})),
			insert: vi.fn(async (rows: unknown[]) => rows),
			claimDue: vi.fn(async () => [delivery()]),
			update: vi.fn(async () => ({})),
			hasOpenWhatsAppWindow: vi.fn(async () => false),
			applyReceipt: vi.fn(async () => ({
				row: delivery({ sourceType: 'message', sourceId: 'm1' }),
				changed: true,
			})),
			markMessageRead: vi.fn(async () => undefined),
			findLatestToPhone: vi.fn(async () => delivery({ sourceType: 'message', sourceId: 'm1' })),
			findThreadForMessage: vi.fn(async () => ({ guardianId: 'g1', studentId: 's1' })),
			findLatestThreadForGuardian: vi.fn(async () => null),
			findAnyChildOfGuardian: vi.fn(async () => null),
			findGuardian: vi.fn(async () => ({ id: 'g1', membershipId: 'parent-m' })),
			countSince: vi.fn(async () => []),
		};
		messages = { receiveFromFamily: vi.fn(async () => ({})) };
		build();
	});

	it('plans one delivery per guardian after the undo window, skipping those without a number', async () => {
		const after = new Date('2026-10-30T07:00:15Z');
		const rows = (await service.planForNotice('n1', after)) as unknown as Record<string, unknown>[];
		expect(rows).toHaveLength(2);
		expect(rows[0]).toMatchObject({
			status: 'queued',
			toPhone: '923001234567',
			notBefore: after,
			templateParams: ['Greenfield', 'Trip', 'Friday'],
		});
		expect(rows[1]).toMatchObject({
			status: 'skipped',
			error: 'No mobile number on file',
			language: 'ur',
		});
	});

	it('skips everything while WhatsApp is not connected or switched off', async () => {
		repository.findChannel.mockResolvedValue(null);
		let rows = (await service.planForMessage('m1')) as unknown as Record<string, unknown>[];
		expect(rows[0]).toMatchObject({ status: 'skipped', error: 'WhatsApp is not connected' });
		repository.findChannel.mockResolvedValue({ status: 'connected' });
		repository.findPolicy.mockResolvedValue({ whatsappEnabled: false, smsFallbackEnabled: true });
		rows = (await service.planForMessage('m1')) as unknown as Record<string, unknown>[];
		expect(rows[0]).toMatchObject({ status: 'skipped' });
	});

	it('does not send a family’s own message back to them', async () => {
		repository.findMessageForDelivery.mockResolvedValue({ direction: 'from_family' });
		expect(await service.planForMessage('m1')).toEqual([]);
	});

	it('holds sends during quiet hours', async () => {
		await service.processDue(25, new Date('2026-10-29T17:30:00Z'));
		expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
		expect(repository.update).toHaveBeenCalledWith('d1', {
			notBefore: new Date('2026-10-30T02:00:00.000Z'),
			attempts: 0,
		});
	});

	it('sends a template; the sandbox counts it delivered, a live provider waits for receipts', async () => {
		await service.processDue(25, NOON_KARACHI);
		expect(whatsapp.sendTemplate).toHaveBeenCalledWith({
			to: '923001234567',
			template: 'school_notice',
			language: 'en',
			params: ['Greenfield', 'Trip', 'Friday'],
		});
		expect(repository.update).toHaveBeenCalledWith(
			'd1',
			expect.objectContaining({ status: 'delivered', providerMessageId: 'wamid.1' }),
		);
		build(true);
		await service.processDue(25, NOON_KARACHI);
		expect(repository.update).toHaveBeenLastCalledWith(
			'd1',
			expect.objectContaining({ status: 'sent', deliveredAt: null }),
		);
	});

	it('sends plain text inside the 24-hour window after the guardian wrote', async () => {
		repository.claimDue.mockResolvedValue([
			delivery({ sourceType: 'message', sourceId: 'm1', template: 'school_message' }),
		]);
		repository.hasOpenWhatsAppWindow.mockResolvedValue(true);
		await service.processDue(25, NOON_KARACHI);
		expect(whatsapp.sendText).toHaveBeenCalledWith({ to: '923001234567', body: 'Get well soon' });
		expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
	});

	it('retries a temporary failure with backoff', async () => {
		whatsapp.sendTemplate.mockRejectedValue(new ProviderError('rate limited', true));
		await service.processDue(25, NOON_KARACHI);
		expect(repository.update).toHaveBeenCalledWith('d1', {
			notBefore: new Date(NOON_KARACHI.getTime() + 60_000),
			error: 'rate limited',
		});
		expect(repository.insert).not.toHaveBeenCalled();
	});

	it('fails for good and falls back to SMS when allowed', async () => {
		whatsapp.sendTemplate.mockRejectedValue(new ProviderError('Invalid number', false));
		await service.processDue(25, NOON_KARACHI);
		expect(repository.update).toHaveBeenCalledWith('d1', {
			status: 'failed',
			error: 'Invalid number',
		});
		expect(repository.insert).toHaveBeenCalledWith([
			expect.objectContaining({ channel: 'sms', fallbackForId: 'd1', status: 'queued' }),
		]);
		repository.insert.mockClear();
		repository.findPolicy.mockResolvedValue({ whatsappEnabled: true, smsFallbackEnabled: false });
		await service.processDue(25, NOON_KARACHI);
		expect(repository.insert).not.toHaveBeenCalled();
	});

	it('marks a message read when WhatsApp says it was read', async () => {
		const at = new Date();
		await service.applyReceipt('wamid.1', 'read', at);
		expect(repository.markMessageRead).toHaveBeenCalledWith('m1', at);
	});

	it('joins a WhatsApp reply to the thread it answers', async () => {
		await service.receiveInbound('+92 300 1234567', ' Thank you ');
		expect(repository.findLatestToPhone).toHaveBeenCalledWith('923001234567');
		expect(messages.receiveFromFamily).toHaveBeenCalledWith({
			tenantId: 't',
			guardianId: 'g1',
			studentId: 's1',
			guardianMembershipId: 'parent-m',
			body: 'Thank you',
		});
	});

	it('ignores replies from numbers the school never wrote to', async () => {
		repository.findLatestToPhone.mockResolvedValue(null);
		expect(await service.receiveInbound('923009999999', 'hi')).toBeNull();
		expect(messages.receiveFromFamily).not.toHaveBeenCalled();
	});
});
