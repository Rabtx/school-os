import { Body, Controller, INestApplication, Module, Post } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as z from 'zod';

import { AppModule } from '@/app.module';
import { setupApp } from '@/app.setup';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import { AppConfigService } from '@/config/app-config.service';

const validationTestSchema = z.object({
	name: z.string().min(1),
});

@Controller({
	path: 'validation-test',
	version: '1',
})
class ValidationTestController {
	@Post()
	create(@Body(new ZodValidationPipe(validationTestSchema)) body: unknown): unknown {
		return body;
	}
}

@Module({
	controllers: [ValidationTestController],
})
class ValidationTestModule {}

describe('AppController (e2e)', () => {
	let app: INestApplication<App>;

	beforeEach(async () => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule, ValidationTestModule],
		}).compile();

		app = moduleFixture.createNestApplication();
		setupApp(app, app.get(AppConfigService));
		await app.init();
	});

	it('/api/v1/health (GET)', async () => {
		const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

		expect(response.body).toEqual({
			success: true,
			statusCode: 200,
			requestId: expect.any(String),
			timestamp: expect.any(String),
			data: {
				status: 'ok',
				service: 'school-os-api',
			},
		});
	});

	it('exposes the optional authentication method routes', async () => {
		const providers = await request(app.getHttpServer()).get('/api/v1/auth/methods').expect(200);

		expect(providers.body.data).toEqual({
			google: { enabled: expect.any(Boolean) },
		});
		await request(app.getHttpServer()).get('/api/v1/auth/security').expect(401);
		await request(app.getHttpServer()).post('/api/v1/auth/security/totp/setup').expect(401);
		await request(app.getHttpServer()).post('/api/v1/auth/security/passkeys/options').expect(401);
	});

	it('returns the standard not found error shape', async () => {
		const response = await request(app.getHttpServer()).get('/api/v1/missing').expect(404);

		expect(response.body).toEqual({
			success: false,
			statusCode: 404,
			code: 'NOT_FOUND',
			message: 'Cannot GET /api/v1/missing',
			requestId: expect.any(String),
			timestamp: expect.any(String),
			path: '/api/v1/missing',
			method: 'GET',
		});
	});

	it('returns the standard validation error shape', async () => {
		const response = await request(app.getHttpServer())
			.post('/api/v1/validation-test')
			.send({ name: '' })
			.expect(400);

		expect(response.body).toEqual({
			success: false,
			statusCode: 400,
			code: 'VALIDATION_ERROR',
			message: 'Request validation failed',
			requestId: expect.any(String),
			timestamp: expect.any(String),
			path: '/api/v1/validation-test',
			method: 'POST',
			errors: [
				{
					code: 'too_small',
					path: 'name',
					message: expect.any(String),
				},
			],
		});
	});

	afterEach(async () => {
		await app.close();
	});
});
