import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/config/app-config.service';
import { OutboxRepository } from './outbox.repository';
import { OutboxDispatchService } from './outbox-dispatch.service';

@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(OutboxProcessorService.name);
	private timer: ReturnType<typeof setInterval> | null = null;
	private processing = false;

	constructor(
		private readonly config: AppConfigService,
		private readonly outboxRepository: OutboxRepository,
		private readonly outboxDispatch: OutboxDispatchService,
	) {}

	onModuleInit(): void {
		if (!this.config.outboxWorkerEnabled) {
			this.logger.log('Outbox worker disabled');
			return;
		}

		this.logger.log(
			`Outbox worker started (poll ${this.config.outboxPollIntervalMs}ms, batch ${this.config.outboxBatchSize})`,
		);

		void this.processPendingBatch();

		this.timer = setInterval(() => {
			void this.processPendingBatch();
		}, this.config.outboxPollIntervalMs);
	}

	onModuleDestroy(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	async processPendingBatch(): Promise<void> {
		if (this.processing) {
			return;
		}

		this.processing = true;

		try {
			const events = await this.outboxRepository.claimPendingBatch(this.config.outboxBatchSize);

			for (const event of events) {
				try {
					// oxlint-disable-next-line no-await-in-loop -- events are dispatched in claim order, one at a time
					await this.outboxDispatch.dispatch(event);
					// oxlint-disable-next-line no-await-in-loop -- events are dispatched in claim order, one at a time
					await this.outboxRepository.markProcessed(event.id);
				} catch (error) {
					this.logger.error(
						`Failed to process outbox event ${event.id} (${event.eventType})`,
						error instanceof Error ? error.stack : error,
					);
					// oxlint-disable-next-line no-await-in-loop -- events are dispatched in claim order, one at a time
					await this.outboxRepository.markFailed(event.id);
				}
			}
		} finally {
			this.processing = false;
		}
	}
}
