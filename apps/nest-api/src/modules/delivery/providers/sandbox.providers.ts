import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';

import type { DeliveryLanguage } from '@/database/schema';
import type { SendResult, SmsProvider, WhatsAppProvider } from './delivery-provider';

/**
 * Local stand-in for WhatsApp: logs the send and returns an id. Nothing leaves the machine; the
 * worker marks sandbox sends delivered so screens can show the full flow.
 */
export class SandboxWhatsAppProvider implements WhatsAppProvider {
	readonly name = 'sandbox' as const;
	readonly live = false;
	private readonly logger = new Logger('SandboxWhatsApp');

	async sendTemplate(input: {
		to: string;
		template: string;
		language: DeliveryLanguage;
		params: string[];
	}): Promise<SendResult> {
		this.logger.log(`template ${input.template}/${input.language} to ${mask(input.to)}`);
		return { providerMessageId: `sandbox-wa-${randomUUID()}` };
	}

	async sendText(input: { to: string; body: string }): Promise<SendResult> {
		this.logger.log(`text to ${mask(input.to)} (${input.body.length} chars)`);
		return { providerMessageId: `sandbox-wa-${randomUUID()}` };
	}
}

export class SandboxSmsProvider implements SmsProvider {
	readonly name = 'sandbox' as const;
	readonly live = false;
	private readonly logger = new Logger('SandboxSms');

	async send(input: { to: string; body: string }): Promise<SendResult> {
		this.logger.log(`sms to ${mask(input.to)} (${input.body.length} chars)`);
		return { providerMessageId: `sandbox-sms-${randomUUID()}` };
	}
}

/** Logs never carry a full phone number. */
function mask(phone: string): string {
	return phone.length > 4 ? `${'•'.repeat(phone.length - 4)}${phone.slice(-4)}` : '••••';
}
