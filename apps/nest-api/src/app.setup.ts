import type { INestApplication } from '@nestjs/common';
import { VersioningType } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { requestIdMiddleware } from '@/common/middleware/request-id.middleware';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import type { AppConfigService } from '@/config/app-config.service';

export function setupApp(app: INestApplication, config: AppConfigService): void {
	const expressApp = app as NestExpressApplication;

	expressApp.use(
		helmet({
			crossOriginResourcePolicy: { policy: 'cross-origin' },
		}),
	);
	expressApp.use(cookieParser());

	if (config.trustProxy) {
		expressApp.getHttpAdapter().getInstance().set('trust proxy', 1);
	}

	app.setGlobalPrefix(config.apiPrefix);
	app.enableVersioning({
		type: VersioningType.URI,
		prefix: 'v',
		defaultVersion: config.apiVersion,
	});

	app.enableCors({
		origin: config.corsOrigins,
		credentials: true,
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'X-Requested-With',
			'X-Request-Id',
			'X-Client-Platform',
		],
	});

	app.use(requestIdMiddleware);
	app.useGlobalPipes(new ZodValidationPipe());
	app.useGlobalInterceptors(new ResponseInterceptor());
	app.useGlobalFilters(new HttpExceptionFilter());

	if (!config.isProduction) {
		const swaggerConfig = new DocumentBuilder()
			.setTitle('School OS API')
			.setDescription('Starter authentication and user API')
			.setVersion(config.apiVersion)
			.addBearerAuth()
			.build();
		const document = SwaggerModule.createDocument(app, swaggerConfig);
		SwaggerModule.setup(`${config.apiPrefix}/docs`, app, document);
	}
}
