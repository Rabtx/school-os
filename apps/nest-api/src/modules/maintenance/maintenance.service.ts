import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

import { AppConfigService } from '@/config/app-config.service';
import { MaintenanceRepository } from './maintenance.repository';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/** Housekeeping that keeps auth tables small. Runs with the background workers (see outbox). */
@Injectable()
export class MaintenanceService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(MaintenanceService.name);
	private timer: ReturnType<typeof setInterval> | null = null;

	constructor(
		private readonly config: AppConfigService,
		private readonly maintenance: MaintenanceRepository,
	) {}

	onModuleInit(): void {
		if (!this.config.outboxWorkerEnabled) return;
		void this.run();
		this.timer = setInterval(() => void this.run(), SIX_HOURS_MS);
	}

	onModuleDestroy(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	async run(): Promise<void> {
		try {
			const result = await this.maintenance.purgeExpired();
			this.logger.log(
				`Maintenance: removed ${result.authChallenges} codes, ${result.webauthnChallenges} WebAuthn challenges, ${result.sessions} sessions; expired ${result.expiredInvites} invites; dropped ${result.abandonedTotpSetups} abandoned TOTP setups`,
			);
		} catch (error) {
			this.logger.error('Maintenance run failed', error instanceof Error ? error.stack : error);
		}
	}
}
