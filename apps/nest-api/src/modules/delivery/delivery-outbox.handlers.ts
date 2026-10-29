import { Injectable } from '@nestjs/common';

import type { OutboxEventRecord } from '@/database/schema';
import type { OutboxEventHandler } from '@/modules/notifications/outbox-dispatch.service';
import { DeliveryService } from './delivery.service';

/** `messages.sent.v1`: a staff member's message to a family goes out on WhatsApp too. */
@Injectable()
export class MessageSentOutboxHandler implements OutboxEventHandler {
	readonly eventType = 'messages.sent.v1';

	constructor(private readonly delivery: DeliveryService) {}

	async handle(event: OutboxEventRecord) {
		const payload = event.payload as { messageId: string; direction: string };
		if (payload.direction !== 'to_family') return;
		await this.delivery.planForMessage(payload.messageId);
	}
}

/** `notices.sent.v1`: each guardian the notice reached gets it on WhatsApp after the undo window. */
@Injectable()
export class NoticeSentOutboxHandler implements OutboxEventHandler {
	readonly eventType = 'notices.sent.v1';

	constructor(private readonly delivery: DeliveryService) {}

	async handle(event: OutboxEventRecord) {
		const payload = event.payload as { noticeId: string; deliverAfter?: string };
		const deliverAfter = payload.deliverAfter ? new Date(payload.deliverAfter) : new Date();
		await this.delivery.planForNotice(payload.noticeId, deliverAfter);
	}
}
