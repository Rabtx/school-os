import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfigService } from '@/config/app-config.service';
import { EmailService } from './email.service';

describe('EmailService', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('does not call Resend when no API key is configured', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		const service = new EmailService(config({ resendApiKey: undefined }));

		await service.sendMagicLink('person@example.com', 'http://localhost:3000/magic-link');

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('sends through the configured sender without exposing the API key', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		const service = new EmailService(config());

		await service.sendVerificationCode('person@example.com', '123456');

		expect(fetchMock).toHaveBeenCalledOnce();
		const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(request.body).toContain('Starter <onboarding@resend.dev>');
		expect(request.body).not.toContain('test-resend-key');
	});

	it('returns an actionable error for an unauthorized sender domain', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ name: 'validation_error', message: 'Domain not verified' }), {
					status: 403,
				}),
			),
		);
		const service = new EmailService(config());

		await expect(
			service.sendPasswordResetCode('person@example.com', '123456'),
		).rejects.toMatchObject({
			response: {
				code: 'EMAIL_DELIVERY_FAILED',
				message: 'The email sender is not authorized. Verify the AUTH_EMAIL_FROM domain in Resend.',
			},
		});
	});
});

function config(overrides: { resendApiKey?: string } = {}): AppConfigService {
	return {
		resendApiKey: 'test-resend-key',
		authEmailFrom: 'Starter <onboarding@resend.dev>',
		...overrides,
	} as AppConfigService;
}
