import { createHmac, timingSafeEqual } from 'node:crypto';
import {
	Controller,
	ForbiddenException,
	Get,
	Headers,
	HttpCode,
	Post,
	Query,
	Req,
	Res,
	UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

import { AppConfigService } from '@/config/app-config.service';
import { DeliveryService } from './delivery.service';

type WebhookPayload = {
	entry?: {
		changes?: {
			value?: {
				statuses?: {
					id?: string;
					status?: string;
					timestamp?: string;
					errors?: { title?: string; message?: string }[];
				}[];
				messages?: { from?: string; type?: string; text?: { body?: string } }[];
			};
		}[];
	}[];
};

const RECEIPTS = new Set(['sent', 'delivered', 'read', 'failed']);

/** True when the body was signed with the app secret (Meta's `X-Hub-Signature-256`). */
export function hasValidSignature(
	rawBody: Buffer,
	header: string | undefined,
	appSecret: string,
): boolean {
	if (!header?.startsWith('sha256=')) return false;
	const expected = Buffer.from(createHmac('sha256', appSecret).update(rawBody).digest('hex'));
	const given = Buffer.from(header.slice('sha256='.length));
	return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Meta's webhook for WhatsApp: the subscription check, delivery receipts, and guardians' replies.
 * Every POST must carry Meta's signature; only a local sandbox setup without an app secret skips it.
 */
@ApiExcludeController()
@Controller({ path: 'webhooks/whatsapp', version: '1' })
export class WhatsAppWebhookController {
	constructor(
		private readonly config: AppConfigService,
		private readonly delivery: DeliveryService,
	) {}

	@Get()
	verify(
		@Query('hub.mode') mode: string,
		@Query('hub.verify_token') token: string,
		@Query('hub.challenge') challenge: string,
		@Res() response: Response,
	) {
		const expected = this.config.whatsapp.meta.verifyToken;
		if (mode !== 'subscribe' || !expected || token !== expected) {
			throw new ForbiddenException({
				code: 'WEBHOOK_VERIFY_FAILED',
				message: 'Verification failed',
			});
		}
		response.type('text/plain').send(challenge);
	}

	@Post()
	@HttpCode(200)
	async receive(
		@Req() request: { rawBody?: Buffer; body: unknown },
		@Headers('x-hub-signature-256') signature: string | undefined,
	) {
		const secret = this.config.whatsapp.meta.appSecret;
		const unsignedAllowed =
			!secret &&
			this.config.whatsapp.provider === 'sandbox' &&
			this.config.nodeEnv !== 'production';
		if (
			!unsignedAllowed &&
			(!secret || !hasValidSignature(request.rawBody ?? Buffer.from(''), signature, secret))
		) {
			throw new UnauthorizedException({
				code: 'WEBHOOK_SIGNATURE_INVALID',
				message: 'Signature check failed',
			});
		}
		const payload = request.body as WebhookPayload;
		let receipts = 0;
		let replies = 0;
		for (const entry of payload.entry ?? []) {
			for (const change of entry.changes ?? []) {
				for (const status of change.value?.statuses ?? []) {
					if (!status.id || !status.status || !RECEIPTS.has(status.status)) continue;
					const at = status.timestamp ? new Date(Number(status.timestamp) * 1000) : new Date();
					const error = status.errors?.[0]?.message ?? status.errors?.[0]?.title;
					// oxlint-disable-next-line no-await-in-loop -- receipts for one message must apply in order
					await this.delivery.applyReceipt(
						status.id,
						status.status as 'sent' | 'delivered' | 'read' | 'failed',
						at,
						error,
					);
					receipts += 1;
				}
				for (const message of change.value?.messages ?? []) {
					if (message.type !== 'text' || !message.from || !message.text?.body) continue;
					// oxlint-disable-next-line no-await-in-loop -- replies join threads in the order sent
					await this.delivery.receiveInbound(message.from, message.text.body);
					replies += 1;
				}
			}
		}
		return { received: true, receipts, replies };
	}
}
