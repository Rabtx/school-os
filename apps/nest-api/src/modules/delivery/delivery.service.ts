import { Inject, Injectable, Logger } from '@nestjs/common';

import {
	type DeliveryChannel,
	type MessageDeliveryRecord,
	messageDeliveries,
} from '@/database/schema';
import { MessagesService } from '@/modules/messages/messages.service';
import { RulesService } from '@/modules/rules/rules.service';
import { DeliveryRepository } from './delivery.repository';
import { toWhatsAppNumber } from './phone';
import {
	ProviderError,
	SMS_PROVIDER,
	type SmsProvider,
	WHATSAPP_PROVIDER,
	type WhatsAppProvider,
} from './providers/delivery-provider';
import { afterQuietHours } from './quiet-hours';
import { renderTemplate, smsText, type TemplateName, templateParams } from './templates';

/** Retries before a WhatsApp send counts as failed and the SMS fallback goes. */
const MAX_ATTEMPTS = 4;
const RETRY_BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000];
const CLAIM_LEASE_MS = 2 * 60_000;
const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;

type Planned = typeof messageDeliveries.$inferInsert;

/**
 * Gets messages and notices to families outside the app. Plans one delivery per guardian when
 * the outbox says something was sent, sends due ones respecting quiet hours, retries, falls back to
 * SMS, and applies the provider's receipts. Replies on WhatsApp come back as family messages.
 */
@Injectable()
export class DeliveryService {
	private readonly logger = new Logger(DeliveryService.name);

	constructor(
		private readonly deliveries: DeliveryRepository,
		private readonly rules: RulesService,
		private readonly messages: MessagesService,
		@Inject(WHATSAPP_PROVIDER) private readonly whatsapp: WhatsAppProvider,
		@Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
	) {}

	/** Outbox: a staff member wrote to a family. */
	async planForMessage(messageId: string) {
		const message = await this.deliveries.findMessageForDelivery(messageId);
		if (!message || message.direction !== 'to_family') return [];
		const school = await this.deliveries.findSchoolName(message.tenantId);
		const params = [school, message.studentFirstName, message.body];
		return this.plan(
			message.tenantId,
			'message',
			message.messageId,
			new Date(),
			'school_message',
			params,
			[{ guardianId: message.guardianId, phone: message.phone, language: message.language }],
		);
	}

	/** Outbox: a notice was sent. Delivery waits until `deliverAfter` (the approval undo window). */
	async planForNotice(noticeId: string, deliverAfter: Date) {
		const found = await this.deliveries.findNoticeForDelivery(noticeId);
		if (!found || found.notice.status !== 'sent') return [];
		const school = await this.deliveries.findSchoolName(found.notice.tenantId);
		return this.plan(
			found.notice.tenantId,
			'notice',
			found.notice.id,
			deliverAfter,
			'school_notice',
			[school, found.notice.title, found.notice.body],
			found.recipients,
		);
	}

	private async plan(
		tenantId: string,
		sourceType: 'message' | 'notice',
		sourceId: string,
		notBefore: Date,
		template: TemplateName,
		params: string[],
		recipients: { guardianId: string; phone: string | null; language: 'en' | 'ur' }[],
	) {
		const [channel, policy] = await Promise.all([
			this.deliveries.findChannel(tenantId, 'whatsapp'),
			this.deliveries.findPolicy(tenantId),
		]);
		const off =
			channel?.status !== 'connected'
				? 'WhatsApp is not connected'
				: !policy.whatsappEnabled
					? 'WhatsApp is switched off in Communication settings'
					: null;
		const rows: Planned[] = recipients.map((recipient) => {
			const phone = toWhatsAppNumber(recipient.phone);
			const skip = off ?? (phone ? null : 'No mobile number on file');
			return {
				tenantId,
				sourceType,
				sourceId,
				guardianId: recipient.guardianId,
				toPhone: phone ?? '',
				channel: 'whatsapp',
				template,
				templateParams: templateParams(params),
				language: recipient.language,
				body: renderTemplate(template, recipient.language, params),
				status: skip ? 'skipped' : 'queued',
				error: skip,
				notBefore,
			};
		});
		return this.deliveries.insert(rows);
	}

	/** Worker: sends what is due. Returns how many it attempted. */
	async processDue(limit = 100, now = new Date()) {
		const claimed = await this.deliveries.claimDue(limit, now, CLAIM_LEASE_MS);
		for (const delivery of claimed) {
			// oxlint-disable-next-line no-await-in-loop -- providers rate-limit; send one at a time
			await this.sendOne(delivery, now);
		}
		return claimed.length;
	}

	private async sendOne(delivery: MessageDeliveryRecord, now: Date) {
		// Quiet hours: hold the send until they end.
		const { clock } = await this.rules.getAttendancePolicy(delivery.tenantId);
		const allowedAt = afterQuietHours(now, clock.timeZone, clock.quietHours);
		if (allowedAt.getTime() > now.getTime()) {
			await this.deliveries.update(delivery.id, {
				notBefore: allowedAt,
				attempts: delivery.attempts - 1,
			});
			return;
		}
		try {
			const result = await this.send(delivery, now);
			await this.deliveries.update(delivery.id, {
				status: this.isLive(delivery.channel) ? 'sent' : 'delivered',
				providerMessageId: result.providerMessageId,
				sentAt: now,
				// The sandbox has no receipts; treat its sends as delivered so screens show the flow.
				deliveredAt: this.isLive(delivery.channel) ? null : now,
				error: null,
			});
		} catch (error) {
			await this.handleFailure(delivery, error, now);
		}
	}

	private async send(delivery: MessageDeliveryRecord, now: Date) {
		if (delivery.channel === 'sms')
			return this.sms.send({ to: delivery.toPhone, body: delivery.body });
		// Inside 24 hours of the guardian's last WhatsApp message, plain text is allowed.
		if (
			delivery.sourceType === 'message' &&
			(await this.deliveries.hasOpenWhatsAppWindow(
				delivery.guardianId,
				new Date(now.getTime() - SERVICE_WINDOW_MS),
			))
		) {
			const message = await this.deliveries.findMessageForDelivery(delivery.sourceId);
			if (message) return this.whatsapp.sendText({ to: delivery.toPhone, body: message.body });
		}
		if (!delivery.template) throw new ProviderError('No template for this delivery', false);
		return this.whatsapp.sendTemplate({
			to: delivery.toPhone,
			template: delivery.template,
			language: delivery.language,
			params: delivery.templateParams ?? [],
		});
	}

	private async handleFailure(delivery: MessageDeliveryRecord, error: unknown, now: Date) {
		const message = error instanceof Error ? error.message : String(error);
		const retryable = error instanceof ProviderError ? error.retryable : true;
		if (retryable && delivery.attempts < MAX_ATTEMPTS) {
			const backoff = RETRY_BACKOFF_MS[delivery.attempts - 1] ?? RETRY_BACKOFF_MS.at(-1) ?? 60_000;
			await this.deliveries.update(delivery.id, {
				notBefore: new Date(now.getTime() + backoff),
				error: message,
			});
			return;
		}
		this.logger.warn(`Delivery ${delivery.id} failed: ${message}`);
		await this.deliveries.update(delivery.id, { status: 'failed', error: message });
		await this.fallBackToSms(delivery, now);
	}

	/** WhatsApp failed for good: send the same text by SMS if the school allows it. */
	private async fallBackToSms(delivery: MessageDeliveryRecord, now: Date) {
		if (delivery.channel !== 'whatsapp') return;
		const policy = await this.deliveries.findPolicy(delivery.tenantId);
		if (!policy.smsFallbackEnabled) return;
		await this.deliveries.insert([
			{
				tenantId: delivery.tenantId,
				sourceType: delivery.sourceType,
				sourceId: delivery.sourceId,
				guardianId: delivery.guardianId,
				toPhone: delivery.toPhone,
				channel: 'sms',
				language: delivery.language,
				body: smsText(delivery.body),
				status: 'queued',
				notBefore: now,
				fallbackForId: delivery.id,
			},
		]);
	}

	private isLive(channel: DeliveryChannel) {
		return channel === 'whatsapp' ? this.whatsapp.live : this.sms.live;
	}

	/** Webhook: a status receipt from WhatsApp. */
	async applyReceipt(
		providerMessageId: string,
		status: 'sent' | 'delivered' | 'read' | 'failed',
		at: Date,
		error?: string,
	) {
		const result = await this.deliveries.applyReceipt(providerMessageId, status, at, error);
		if (!result?.changed) return;
		const { row } = result;
		if (status === 'read' && row.sourceType === 'message') {
			await this.deliveries.markMessageRead(row.sourceId, at);
		}
		if (status === 'failed') await this.fallBackToSms(row, at);
	}

	/**
	 * Webhook: a guardian wrote on WhatsApp. The number is matched to the school and guardian that
	 * last messaged it, and the text joins that conversation.
	 */
	async receiveInbound(fromPhone: string, body: string) {
		const phone = toWhatsAppNumber(fromPhone);
		if (!phone || !body.trim()) return null;
		const last = await this.deliveries.findLatestToPhone(phone);
		if (!last) {
			this.logger.log('Inbound WhatsApp from a number we never wrote to; ignored');
			return null;
		}
		const thread =
			(last.sourceType === 'message'
				? await this.deliveries.findThreadForMessage(last.sourceId)
				: null) ?? (await this.deliveries.findLatestThreadForGuardian(last.guardianId));
		const studentId =
			thread?.studentId ?? (await this.deliveries.findAnyChildOfGuardian(last.guardianId));
		if (!studentId) return null;
		const guardian = await this.deliveries.findGuardian(last.guardianId);
		return this.messages.receiveFromFamily({
			tenantId: last.tenantId,
			guardianId: last.guardianId,
			studentId,
			guardianMembershipId: guardian?.membershipId ?? null,
			body: body.trim(),
		});
	}

	/** For Settings and the sidebar card. */
	async status(tenantId: string) {
		const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const [channel, policy, counts] = await Promise.all([
			this.deliveries.findChannel(tenantId, 'whatsapp'),
			this.deliveries.findPolicy(tenantId),
			this.deliveries.countSince(tenantId, since),
		]);
		const sum = (channelName: DeliveryChannel, statuses: string[]) =>
			counts
				.filter((row) => row.channel === channelName && statuses.includes(row.status))
				.reduce((total, row) => total + row.count, 0);
		return {
			whatsapp: {
				connected: channel?.status === 'connected',
				enabled: policy.whatsappEnabled,
				provider: this.whatsapp.name,
				live: this.whatsapp.live,
				connectedAt: channel?.connectedAt?.toISOString() ?? null,
			},
			sms: {
				fallbackEnabled: policy.smsFallbackEnabled,
				provider: this.sms.name,
				live: this.sms.live,
			},
			last24h: {
				queued: sum('whatsapp', ['queued']),
				sent: sum('whatsapp', ['sent', 'delivered', 'read']),
				delivered: sum('whatsapp', ['delivered', 'read']),
				read: sum('whatsapp', ['read']),
				failed: sum('whatsapp', ['failed']),
				skipped: sum('whatsapp', ['skipped']),
				sms: sum('sms', ['sent', 'delivered', 'read']),
			},
		};
	}

	setConnected(tenantId: string, connected: boolean, membershipId: string) {
		return this.deliveries.setChannel(
			tenantId,
			'whatsapp',
			connected ? 'connected' : 'disconnected',
			membershipId,
		);
	}

	recent(tenantId: string, limit = 50) {
		return this.deliveries.recent(tenantId, limit);
	}
}
