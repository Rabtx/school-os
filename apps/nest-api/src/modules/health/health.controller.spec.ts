import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ConfigModule } from '@/config/config.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
	let controller: HealthController;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			imports: [ConfigModule],
			controllers: [HealthController],
			providers: [HealthService],
		}).compile();

		controller = module.get(HealthController);
	});

	it('returns the API health status', () => {
		expect(controller.getHealth()).toEqual({
			status: 'ok',
			service: 'school-os-api',
		});
	});
});
