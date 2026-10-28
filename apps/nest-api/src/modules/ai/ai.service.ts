import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import type {
	AcademicDraftRequestInput,
	AcademicDraftResponse,
	AssistRequestInput,
	AssistResponse,
} from './ai.dto';

/**
 * The AI layer moves to TypeScript inside this API (tool registry, retrieval, memory and evals;
 * see the AI board cards). Until a provider is wired in, the routes stay in place with the same
 * contracts and say plainly that AI is not set up, so the web can show that instead of failing.
 */
@Injectable()
export class AiService {
	assist(_tenantId: string, _userId: string, _body: AssistRequestInput): Promise<AssistResponse> {
		return Promise.reject(notConfigured());
	}

	draftAcademics(
		_tenantId: string,
		_userId: string,
		_body: AcademicDraftRequestInput,
	): Promise<AcademicDraftResponse> {
		return Promise.reject(notConfigured());
	}

	status(): Promise<{ ok: boolean; provider?: string }> {
		return Promise.resolve({ ok: false });
	}
}

function notConfigured() {
	return new ServiceUnavailableException({
		code: 'AI_NOT_CONFIGURED',
		message: 'AI assistance is not set up yet',
	});
}
