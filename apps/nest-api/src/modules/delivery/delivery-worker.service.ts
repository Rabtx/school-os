import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/config/app-config.service';
import { DeliveryService } from './delivery.service';

/** Sends due WhatsApp and SMS deliveries on an interval, one batch at a time. */
@Injectable()
export class DeliveryWorkerService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(DeliveryWorkerService.name);
	private timer: ReturnType<typeof setInterval> | null = null;
	private running = false;

	constructor(
		private readonly config: AppConfigService,
		private readonly delivery: DeliveryService,
	) {}

	onModuleInit() {
		if (!this.config.deliveryWorkerEnabled) {
			this.logger.log('Delivery worker disabled');
			return;
		}
		this.logger.log(
			`Delivery worker started (${this.config.whatsapp.provider} WhatsApp, ${this.config.smsProvider} SMS, poll ${this.config.deliveryPollIntervalMs}ms)`,
		);
		this.timer = setInterval(() => void this.tick(), this.config.deliveryPollIntervalMs);
	}

	onModuleDestroy() {
		if (this.timer) clearInterval(this.timer);
		this.timer = null;
	}

	async tick() {
		if (this.running) return;
		this.running = true;
		try {
			await this.delivery.processDue();
		} catch (error) {
			this.logger.error('Delivery batch failed', error as Error);
		} finally {
			this.running = false;
		}
	}
}
