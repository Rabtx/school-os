import { BadRequestException, Injectable } from '@nestjs/common';
import * as z from 'zod';

import { assessmentResultStatusSchema } from '@/modules/assessments/assessments.dto';
import { AssessmentsService } from '@/modules/assessments/assessments.service';
import type { ApprovalHandler } from '../approval-handler';

const inputSchema = z
	.object({
		assessmentId: z.string().uuid(),
		studentId: z.string().uuid(),
		status: assessmentResultStatusSchema,
		score: z.number().min(0).nullable(),
	})
	.strict();

type Input = z.infer<typeof inputSchema>;
type Mark = { status: z.infer<typeof assessmentResultStatusSchema>; score: number | null };

export type MarksChangePayload = Input & {
	assessmentTitle: string;
	sectionName: string;
	subjectName: string;
	maxScore: number;
	studentName: string;
	previous: Mark;
};

/** Requests nobody decides within two weeks drop out of the queue; the mark stays. */
const EXPIRES_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

/** "18 / 25", "Absent" or "Not marked". */
export function markLabel(mark: Mark, maxScore: number): string {
	if (mark.status === 'absent') return 'Absent';
	if (mark.status === 'graded' && mark.score !== null) return `${mark.score} / ${maxScore}`;
	return 'Not marked';
}

function sameMark(a: Mark, b: Mark) {
	return a.status === b.status && (a.status !== 'graded' || a.score === b.score);
}

/**
 * A teacher asks to change a mark on a closed test (closed marks feed report cards). Approving
 * sets the mark as the approver; undo puts back the mark it replaced.
 */
@Injectable()
export class MarksChangeHandler implements ApprovalHandler<Input, MarksChangePayload> {
	readonly type = 'marks_change';
	readonly label = 'Marks change';
	readonly inputSchema = inputSchema;

	constructor(private readonly assessments: AssessmentsService) {}

	async prepare(context: { userId: string; tenantId: string }, input: Input) {
		const found = await this.assessments.prepareMarkChange(context.userId, context.tenantId, input);
		if (found.canEditNow) {
			throw new BadRequestException({
				code: 'APPROVAL_NOT_NEEDED',
				message: 'This test is still open. Change the mark yourself.',
			});
		}
		const next = { status: input.status, score: input.status === 'graded' ? input.score : null };
		if (sameMark(found.previous, next)) {
			throw new BadRequestException({
				code: 'APPROVAL_NO_CHANGE',
				message: `${found.studentName} already has ${markLabel(next, found.maxScore)}.`,
			});
		}
		const { canEditNow: _canEditNow, ...snapshot } = found;
		return {
			payload: { ...input, score: next.score, ...snapshot },
			dedupeKey: `marks:${input.assessmentId}:${input.studentId}`,
			risk: 'medium' as const,
			approverRole: 'leadership' as const,
			expiresAt: new Date(Date.now() + EXPIRES_AFTER_MS),
		};
	}

	describe(payload: MarksChangePayload) {
		const to = markLabel(payload, payload.maxScore);
		return {
			title: `Change ${payload.studentName}’s mark to ${to}`,
			subtitle: `${payload.sectionName} · ${payload.subjectName} · ${payload.assessmentTitle} · closed`,
			quote: null,
			facts: [
				{ label: 'Mark now', value: markLabel(payload.previous, payload.maxScore) },
				{ label: 'Change to', value: to },
			],
			outcome: `If you approve: the mark changes on ${payload.assessmentTitle}, in marks and on the report card, and the change is kept in the audit log.`,
			approveLabel: 'Approve change',
			declineTitle: 'Say no to this mark change?',
			declineReasons: ['Mark was right', 'Recheck the paper first', 'Other'],
		};
	}

	async apply(context: { tenantId: string }, payload: MarksChangePayload) {
		const replaced = await this.assessments.applyMarkChange({
			tenantId: context.tenantId,
			assessmentId: payload.assessmentId,
			studentId: payload.studentId,
			status: payload.status,
			score: payload.score,
		});
		return {
			headline: `${payload.studentName} now has ${markLabel(payload, payload.maxScore)} on ${payload.assessmentTitle}.`,
			facts: [
				{
					label: 'Marks',
					value: `${markLabel(replaced, payload.maxScore)} → ${markLabel(payload, payload.maxScore)}`,
				},
				{ label: 'Report card', value: 'Uses the new mark' },
			],
			undo: { status: replaced.status, score: replaced.score },
		};
	}

	async undo(
		context: { tenantId: string },
		payload: MarksChangePayload,
		undo: Record<string, unknown>,
	) {
		const previous = z
			.object({ status: assessmentResultStatusSchema, score: z.number().nullable() })
			.parse(undo);
		await this.assessments.applyMarkChange({
			tenantId: context.tenantId,
			assessmentId: payload.assessmentId,
			studentId: payload.studentId,
			...previous,
		});
	}

	expired(payload: MarksChangePayload) {
		return {
			summary: `Nobody decided within two weeks, so ${payload.studentName} keeps ${markLabel(payload.previous, payload.maxScore)}.`,
			facts: [
				{ label: 'Marks', value: `Kept as ${markLabel(payload.previous, payload.maxScore)}` },
			],
		};
	}

	declined(payload: MarksChangePayload, reason: string) {
		return `${payload.studentName} keeps ${markLabel(payload.previous, payload.maxScore)} on ${payload.assessmentTitle}. Reason: ${reason}`;
	}
}
