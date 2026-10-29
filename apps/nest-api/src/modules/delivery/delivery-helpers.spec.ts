import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';

import { toWhatsAppNumber } from './phone';
import { ProviderError } from './providers/delivery-provider';
import { MetaWhatsAppProvider } from './providers/meta-whatsapp.provider';
import { afterQuietHours } from './quiet-hours';
import { renderTemplate, smsText, templateParams } from './templates';
import { hasValidSignature } from './whatsapp-webhook.controller';

const quiet = { start: '21:00', end: '07:00' };

describe('phone numbers', () => {
	it('turns local and international numbers into WhatsApp form', () => {
		expect(toWhatsAppNumber('0300 1234567')).toBe('923001234567');
		expect(toWhatsAppNumber('+92 300-1234567')).toBe('923001234567');
		expect(toWhatsAppNumber('0092 300 1234567')).toBe('923001234567');
		expect(toWhatsAppNumber('12345')).toBeNull();
		expect(toWhatsAppNumber(null)).toBeNull();
	});
});

describe('quiet hours', () => {
	it('holds evening sends until the next morning and early ones until the end', () => {
		// 22:30 in Karachi (UTC+5) is 17:30Z; quiet hours end at 07:00 local = 02:00Z next day.
		expect(
			afterQuietHours(new Date('2026-10-29T17:30:00Z'), 'Asia/Karachi', quiet).toISOString(),
		).toBe('2026-10-30T02:00:00.000Z');
		// 05:00 local = 00:00Z, same day's 07:00 = 02:00Z.
		expect(
			afterQuietHours(new Date('2026-10-30T00:00:00Z'), 'Asia/Karachi', quiet).toISOString(),
		).toBe('2026-10-30T02:00:00.000Z');
		const noon = new Date('2026-10-30T07:00:00Z');
		expect(afterQuietHours(noon, 'Asia/Karachi', quiet)).toBe(noon);
	});
});

describe('templates', () => {
	it('renders English and Urdu and keeps parameters on one line', () => {
		expect(
			renderTemplate('school_notice', 'en', ['Greenfield', 'Trip form', 'Send it\nby Friday']),
		).toBe('Greenfield notice: Trip form\n\nSend it by Friday');
		expect(renderTemplate('school_notice', 'ur', ['Greenfield', 'Trip', 'x'])).toContain('کا اعلان');
		expect(templateParams(['a'.repeat(1200)])[0]).toHaveLength(1000);
		expect(smsText('one\n\ntwo', 300)).toBe('one two');
	});
});

describe('webhook signature', () => {
	it('accepts only bodies signed with the app secret', () => {
		const body = Buffer.from('{"entry":[]}');
		const signature = `sha256=${createHmac('sha256', 'secret').update(body).digest('hex')}`;
		expect(hasValidSignature(body, signature, 'secret')).toBe(true);
		expect(hasValidSignature(body, signature, 'other')).toBe(false);
		expect(hasValidSignature(body, undefined, 'secret')).toBe(false);
		expect(hasValidSignature(body, 'sha256=short', 'secret')).toBe(false);
	});
});

describe('Meta WhatsApp provider', () => {
	const options = { accessToken: 'token', phoneNumberId: '123', apiVersion: 'v21.0' };

	it('sends a template and returns the message id', async () => {
		const fetchMock = vi.fn(
			async () => new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }),
		);
		const provider = new MetaWhatsAppProvider(options, fetchMock as unknown as typeof fetch);
		const result = await provider.sendTemplate({
			to: '923001234567',
			template: 'school_notice',
			language: 'ur',
			params: ['a', 'b'],
		});
		expect(result.providerMessageId).toBe('wamid.1');
		const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('https://graph.facebook.com/v21.0/123/messages');
		expect(JSON.parse(String(init.body))).toMatchObject({
			type: 'template',
			template: { name: 'school_notice', language: { code: 'ur' } },
		});
	});

	it('marks rate limits retryable and bad numbers final', async () => {
		const limited = new MetaWhatsAppProvider(
			options,
			(async () => new Response('{}', { status: 429 })) as unknown as typeof fetch,
		);
		await expect(limited.sendText({ to: '1', body: 'x' })).rejects.toMatchObject({
			retryable: true,
		});
		const refused = new MetaWhatsAppProvider(
			options,
			(async () =>
				new Response(JSON.stringify({ error: { message: 'Invalid number' } }), {
					status: 400,
				})) as unknown as typeof fetch,
		);
		await expect(refused.sendText({ to: '1', body: 'x' })).rejects.toEqual(
			new ProviderError('Invalid number', false),
		);
	});
});
