import { Logger } from '@nestjs/common';

import type { DeliveryLanguage } from '@/database/schema';
import { ProviderError, type SendResult, type WhatsAppProvider } from './delivery-provider';

/** Meta's language codes for the template languages we send. */
const META_LANGUAGE: Record<DeliveryLanguage, string> = { en: 'en', ur: 'ur' };
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * WhatsApp Cloud API (graph.facebook.com). Rate limits and server errors are retryable; a bad
 * number or an unapproved template is not.
 */
export class MetaWhatsAppProvider implements WhatsAppProvider {
	readonly name = 'meta' as const;
	readonly live = true;
	private readonly logger = new Logger(MetaWhatsAppProvider.name);

	constructor(
		private readonly options: { accessToken: string; phoneNumberId: string; apiVersion: string },
		private readonly fetchImpl: typeof fetch = fetch,
	) {}

	sendTemplate(input: {
		to: string;
		template: string;
		language: DeliveryLanguage;
		params: string[];
	}) {
		return this.post({
			messaging_product: 'whatsapp',
			to: input.to,
			type: 'template',
			template: {
				name: input.template,
				language: { code: META_LANGUAGE[input.language] },
				components: [
					{
						type: 'body',
						parameters: input.params.map((text) => ({ type: 'text', text })),
					},
				],
			},
		});
	}

	sendText(input: { to: string; body: string }) {
		return this.post({
			messaging_product: 'whatsapp',
			to: input.to,
			type: 'text',
			text: { body: input.body, preview_url: false },
		});
	}

	private async post(payload: unknown): Promise<SendResult> {
		const url = `https://graph.facebook.com/${this.options.apiVersion}/${this.options.phoneNumberId}/messages`;
		let response: Response;
		try {
			response = await this.fetchImpl(url, {
				method: 'POST',
				headers: {
					authorization: `Bearer ${this.options.accessToken}`,
					'content-type': 'application/json',
				},
				body: JSON.stringify(payload),
				signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
			});
		} catch (error) {
			throw new ProviderError(`WhatsApp request failed: ${(error as Error).message}`, true);
		}
		const body = (await response.json().catch(() => null)) as {
			messages?: { id?: string }[];
			error?: { message?: string; code?: number };
		} | null;
		if (!response.ok) {
			const message = body?.error?.message ?? `HTTP ${response.status}`;
			const retryable = response.status === 429 || response.status >= 500;
			this.logger.warn(`WhatsApp send refused (${response.status}): ${message}`);
			throw new ProviderError(message, retryable);
		}
		const id = body?.messages?.[0]?.id;
		if (!id) throw new ProviderError('WhatsApp response had no message id', true);
		return { providerMessageId: id };
	}
}
