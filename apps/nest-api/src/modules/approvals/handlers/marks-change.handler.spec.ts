import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssessmentsService } from '@/modules/assessments/assessments.service';
import { MarksChangeHandler, markLabel } from './marks-change.handler';

const input = {
	assessmentId: '22222222-2222-4222-8222-222222222222',
	studentId: '33333333-3333-4333-8333-333333333333',
	status: 'graded' as const,
	score: 21,
};
const found = {
	assessmentTitle: 'English test 1',
	sectionName: 'Grade 1-A',
	subjectName: 'English',
	maxScore: 25,
	studentName: 'Ava Sheikh',
	previous: { status: 'graded' as const, score: 18 },
	canEditNow: false,
};

describe('MarksChangeHandler', () => {
	let assessments: Record<string, ReturnType<typeof vi.fn>>;
	let handler: MarksChangeHandler;

	beforeEach(() => {
		assessments = {
			prepareMarkChange: vi.fn(async () => found),
			applyMarkChange: vi.fn(async () => ({ status: 'graded', score: 18 })),
		};
		handler = new MarksChangeHandler(assessments as unknown as AssessmentsService);
	});

	it('labels marks', () => {
		expect(markLabel({ status: 'graded', score: 18 }, 25)).toBe('18 / 25');
		expect(markLabel({ status: 'absent', score: null }, 25)).toBe('Absent');
		expect(markLabel({ status: 'pending', score: null }, 25)).toBe('Not marked');
	});

	it('snapshots the test and keys one request per student per test', async () => {
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, input);
		expect(prepared.dedupeKey).toBe(`marks:${input.assessmentId}:${input.studentId}`);
		expect(prepared.payload).not.toHaveProperty('canEditNow');
		const card = handler.describe(prepared.payload);
		expect(card.title).toBe('Change Ava Sheikh’s mark to 21 / 25');
		expect(card.facts).toEqual([
			{ label: 'Mark now', value: '18 / 25' },
			{ label: 'Change to', value: '21 / 25' },
		]);
	});

	it('sends the teacher back while the test is open', async () => {
		assessments.prepareMarkChange.mockResolvedValue({ ...found, canEditNow: true });
		await expect(handler.prepare({ userId: 'u', tenantId: 't' }, input)).rejects.toMatchObject({
			response: { code: 'APPROVAL_NOT_NEEDED' },
		});
	});

	it('refuses the mark already there, ignoring a score on absent', async () => {
		assessments.prepareMarkChange.mockResolvedValue({
			...found,
			previous: { status: 'absent', score: null },
		});
		await expect(
			handler.prepare({ userId: 'u', tenantId: 't' }, { ...input, status: 'absent', score: 3 }),
		).rejects.toMatchObject({ response: { code: 'APPROVAL_NO_CHANGE' } });
	});

	it('applies as the approver and undoes to the mark it replaced', async () => {
		const prepared = await handler.prepare({ userId: 'u', tenantId: 't' }, input);
		const effect = await handler.apply({ tenantId: 't' }, prepared.payload);
		expect(effect.facts[0]).toEqual({ label: 'Marks', value: '18 / 25 → 21 / 25' });
		await handler.undo({ tenantId: 't' }, prepared.payload, effect.undo);
		expect(assessments.applyMarkChange).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'graded', score: 18 }),
		);
	});
});
