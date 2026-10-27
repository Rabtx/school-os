import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppConfigService } from '@/config/app-config.service';
import { type OutboxEventRecord } from '@/database/schema';
import { OutboxRepository, outboxBackoffMs } from './outbox.repository';
import { OutboxDispatchService } from './outbox-dispatch.service';
import { OutboxProcessorService } from './outbox-processor.service';

describe('OutboxProcessorService', () => {
	let processor: OutboxProcessorService;
	let outboxRepository: {
		claimPendingBatch: ReturnType<typeof vi.fn>;
		markProcessed: ReturnType<typeof vi.fn>;
		markFailed: ReturnType<typeof vi.fn>;
	};
	let outboxDispatch: { dispatch: ReturnType<typeof vi.fn> };

	const sampleEvent = {
		id: 'event-1',
		eventType: 'attendance.manual_marked.v1',
	} as OutboxEventRecord;

	beforeEach(async () => {
		outboxRepository = {
			claimPendingBatch: vi.fn().mockResolvedValue([sampleEvent]),
			markProcessed: vi.fn().mockResolvedValue(undefined),
			markFailed: vi.fn().mockResolvedValue(undefined),
		};
		outboxDispatch = {
			dispatch: vi.fn().mockResolvedValue(undefined),
		};

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				OutboxProcessorService,
				{
					provide: AppConfigService,
					useValue: {
						outboxWorkerEnabled: true,
						outboxPollIntervalMs: 60_000,
						outboxBatchSize: 10,
						outboxLeaseMs: 60_000,
						outboxMaxAttempts: 8,
					},
				},
				{ provide: OutboxRepository, useValue: outboxRepository },
				{ provide: OutboxDispatchService, useValue: outboxDispatch },
			],
		}).compile();

		processor = module.get(OutboxProcessorService);
	});

	it('marks events processed after successful dispatch', async () => {
		await processor.processPendingBatch();

		expect(outboxRepository.claimPendingBatch).toHaveBeenCalledWith(10, 60_000);
		expect(outboxDispatch.dispatch).toHaveBeenCalledWith(sampleEvent);
		expect(outboxRepository.markProcessed).toHaveBeenCalledWith('event-1');
		expect(outboxRepository.markFailed).not.toHaveBeenCalled();
	});

	it('hands a failed dispatch to the retry policy with its error', async () => {
		outboxDispatch.dispatch.mockRejectedValue(new Error('dispatch failed'));

		await processor.processPendingBatch();

		expect(outboxRepository.markFailed).toHaveBeenCalledWith(sampleEvent, 'dispatch failed', 8);
		expect(outboxRepository.markProcessed).not.toHaveBeenCalled();
	});

	it('backs off exponentially and caps at an hour', () => {
		expect(outboxBackoffMs(1)).toBe(30_000);
		expect(outboxBackoffMs(2)).toBe(60_000);
		expect(outboxBackoffMs(4)).toBe(240_000);
		expect(outboxBackoffMs(20)).toBe(3_600_000);
	});
});
