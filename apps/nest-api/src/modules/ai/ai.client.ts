import {
	BadGatewayException,
	Injectable,
	Logger,
	ServiceUnavailableException,
} from '@nestjs/common';

import { AppConfigService } from '@/config/app-config.service';
import type { AssistRequestInput, AssistResponse } from './ai.dto';

const MAX_AI_REPLY_LENGTH = 100_000;

@Injectable()
export class AiClient {
	private readonly logger = new Logger(AiClient.name);

	constructor(private readonly config: AppConfigService) {}

	async assist(
		tenantId: string,
		userId: string,
		body: AssistRequestInput,
	): Promise<AssistResponse> {
		const url = `${this.config.aiApiUrl}/api/v1/assist`;

		let response: Response;
		try {
			response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-AI-Service-Token': this.config.aiServiceToken,
					'X-Tenant-Id': tenantId,
					'X-User-Id': userId,
				},
				body: JSON.stringify(body),
			});
		} catch (error) {
			this.logger.error('AI API unreachable', error instanceof Error ? error.stack : undefined);
			throw new ServiceUnavailableException({
				code: 'AI_UNAVAILABLE',
				message: 'AI assistance service is unavailable',
			});
		}

		const payload: unknown = await response.json().catch(() => ({}));

		if (!response.ok) {
			this.logger.warn(`AI API returned ${response.status}`);
			throw new BadGatewayException({
				code: 'AI_UPSTREAM_ERROR',
				message: 'AI assistance upstream request failed',
			});
		}

		if (!isAssistResponse(payload)) {
			throw new BadGatewayException({
				code: 'AI_INVALID_RESPONSE',
				message: 'AI assistance returned an invalid response',
			});
		}

		if (payload.reply.length > MAX_AI_REPLY_LENGTH) {
			this.logger.warn(`AI API reply exceeded ${MAX_AI_REPLY_LENGTH} characters`);
			throw new BadGatewayException({
				code: 'AI_REPLY_TOO_LARGE',
				message: 'AI assistance returned an oversized response',
			});
		}

		return payload;
	}

	async health(): Promise<{ ok: boolean; provider?: string }> {
		try {
			const response = await fetch(`${this.config.aiApiUrl}/api/v1/health`);
			if (!response.ok) {
				return { ok: false };
			}
			const payload: unknown = await response.json();
			if (
				typeof payload === 'object' &&
				payload !== null &&
				'provider' in payload &&
				typeof (payload as { provider: unknown }).provider === 'string'
			) {
				return { ok: true, provider: (payload as { provider: string }).provider };
			}
			return { ok: true };
		} catch {
			return { ok: false };
		}
	}
}

function isAssistResponse(value: unknown): value is AssistResponse {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		typeof record.reply === 'string' &&
		typeof record.provider === 'string' &&
		typeof record.model === 'string'
	);
}
