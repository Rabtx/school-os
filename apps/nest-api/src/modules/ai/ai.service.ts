import { Injectable } from '@nestjs/common';

import { AiClient } from './ai.client';
import type {
	AcademicDraftRequestInput,
	AcademicDraftResponse,
	AssistRequestInput,
	AssistResponse,
} from './ai.dto';

@Injectable()
export class AiService {
	constructor(private readonly client: AiClient) {}

	assist(tenantId: string, userId: string, body: AssistRequestInput): Promise<AssistResponse> {
		return this.client.assist(tenantId, userId, body);
	}

	async draftAcademics(
		tenantId: string,
		userId: string,
		body: AcademicDraftRequestInput,
	): Promise<AcademicDraftResponse> {
		const toneLabel =
			body.tone === 'challenge'
				? 'stretch/challenge level'
				: body.tone === 'support'
					? 'support/scaffolded level'
					: 'standard grade level';

		const contextParts = [
			`Task: draft a ${body.kind} assignment for a K-12 school.`,
			body.subjectName ? `Subject: ${body.subjectName}.` : null,
			body.sectionName ? `Class/section: ${body.sectionName}.` : null,
			body.gradeLevel ? `Grade level: ${body.gradeLevel}.` : null,
			body.durationMinutes ? `Suggested duration: ${body.durationMinutes} minutes.` : null,
			body.maxScore ? `Max score: ${body.maxScore}.` : null,
			body.assessmentType ? `Assessment type: ${body.assessmentType}.` : null,
			`Difficulty tone: ${toneLabel}.`,
			'Return JSON only with keys: title (string), description (string), materials (string|null), instructions (string|null).',
			'Description should include numbered tasks students can follow. No markdown fences.',
		].filter(Boolean);

		const response = await this.client.assist(tenantId, userId, {
			context: contextParts.join('\n'),
			messages: [
				{
					role: 'user',
					content: `Draft a ${body.kind} about: ${body.topic}`,
				},
			],
		});

		const parsed = parseAcademicDraft(response.reply, body.topic, body.kind);

		return {
			...parsed,
			provider: response.provider,
			model: response.model,
		};
	}

	status(): Promise<{ ok: boolean; provider?: string }> {
		return this.client.health();
	}
}

function parseAcademicDraft(
	reply: string,
	topic: string,
	kind: AcademicDraftRequestInput['kind'],
): Omit<AcademicDraftResponse, 'provider' | 'model'> {
	const trimmed = reply.trim();
	try {
		const jsonStart = trimmed.indexOf('{');
		const jsonEnd = trimmed.lastIndexOf('}');
		if (jsonStart >= 0 && jsonEnd > jsonStart) {
			const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
				title?: string;
				description?: string;
				materials?: string | null;
				instructions?: string | null;
			};
			return {
				title: parsed.title?.trim() || `${capitalize(topic)} ${kind}`,
				description: parsed.description?.trim() || trimmed,
				materials: parsed.materials?.trim() || null,
				instructions: parsed.instructions?.trim() || null,
			};
		}
	} catch {
		// fall through to plain-text fallback
	}

	return {
		title: `${capitalize(topic)} ${kind}`,
		description: trimmed,
		materials: null,
		instructions: kind === 'assessment' ? trimmed : null,
	};
}

function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}
