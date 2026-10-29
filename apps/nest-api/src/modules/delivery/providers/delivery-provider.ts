import type { DeliveryLanguage } from '@/database/schema';

export type SendResult = { providerMessageId: string };

/** A send the provider refused; `retryable` tells the worker whether trying again can help. */
export class ProviderError extends Error {
	constructor(
		message: string,
		readonly retryable: boolean,
	) {
		super(message);
		this.name = 'ProviderError';
	}
}

export interface WhatsAppProvider {
	readonly name: 'sandbox' | 'meta';
	/** True when sends leave the building; false for the sandbox. */
	readonly live: boolean;
	/** Business-initiated messages must use a template the provider approved. */
	sendTemplate(input: {
		to: string;
		template: string;
		language: DeliveryLanguage;
		params: string[];
	}): Promise<SendResult>;
	/** Free text, allowed inside 24 hours of the guardian's last message. */
	sendText(input: { to: string; body: string }): Promise<SendResult>;
}

export interface SmsProvider {
	readonly name: 'sandbox';
	readonly live: boolean;
	send(input: { to: string; body: string }): Promise<SendResult>;
}

export const WHATSAPP_PROVIDER = Symbol('WHATSAPP_PROVIDER');
export const SMS_PROVIDER = Symbol('SMS_PROVIDER');
