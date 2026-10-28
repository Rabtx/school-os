import { describe, expect, it } from 'vitest';

import type {
	AssessmentRecord,
	AssessmentResultRecord,
	HomeworkAssignmentRecord,
	HomeworkSubmissionRecord,
} from '@/database/schema';
import { buildMarksheet } from './gradebook-marksheet';

const at = new Date('2026-10-01T00:00:00Z');

function assessment(overrides: Partial<AssessmentRecord>): AssessmentRecord {
	return {
		id: 'a-1',
		tenantId: 't',
		sectionSubjectId: 'ss',
		type: 'test',
		title: 'Test 1',
		assessedOn: '2026-10-10',
		maxScore: '50',
		status: 'published',
		assignMode: 'whole_class',
		startsAt: null,
		durationMinutes: null,
		room: null,
		instructions: null,
		createdByMembershipId: 'm',
		createdAt: at,
		updatedAt: at,
		...overrides,
	};
}

function result(overrides: Partial<AssessmentResultRecord>): AssessmentResultRecord {
	return {
		id: 'r',
		tenantId: 't',
		assessmentId: 'a-1',
		studentId: 's-1',
		score: null,
		status: 'pending',
		createdAt: at,
		updatedAt: at,
		...overrides,
	};
}

function homework(overrides: Partial<HomeworkAssignmentRecord>): HomeworkAssignmentRecord {
	return {
		id: 'h-1',
		tenantId: 't',
		sectionSubjectId: 'ss',
		title: 'Set A',
		description: null,
		materials: null,
		dueAt: new Date('2026-10-05T12:00:00Z'),
		status: 'published',
		estimatedMinutes: null,
		assignMode: 'whole_class',
		createdByMembershipId: 'm',
		createdAt: at,
		updatedAt: at,
		...overrides,
	} as HomeworkAssignmentRecord;
}

function submission(overrides: Partial<HomeworkSubmissionRecord>): HomeworkSubmissionRecord {
	return {
		id: 'sub',
		tenantId: 't',
		homeworkId: 'h-1',
		studentId: 's-1',
		status: 'pending',
		submittedAt: null,
		grade: null,
		marksObtained: null,
		totalMarks: null,
		feedback: null,
		attachmentUrl: null,
		gradedBy: null,
		gradedAt: null,
		createdAt: at,
		updatedAt: at,
		...overrides,
	} as HomeworkSubmissionRecord;
}

const students = [
	{ id: 's-1', firstName: 'Ali', lastName: 'Hassan', studentCode: 'S1' },
	{ id: 's-2', firstName: 'Sara', lastName: 'Khan', studentCode: 'S2' },
];

describe('buildMarksheet', () => {
	it('puts tests and homework on one timeline and averages every marked item', () => {
		const sheet = buildMarksheet({
			sectionId: 'sec',
			subject: { id: 'sub', code: 'MATH', name: 'Maths' },
			students,
			assessments: [assessment({})],
			assessmentResults: [
				result({ studentId: 's-1', score: '40', status: 'graded' }),
				result({ studentId: 's-2', status: 'absent' }),
			],
			assessmentRecipients: [],
			homework: [
				homework({}),
				homework({ id: 'h-2', title: 'Set B', dueAt: new Date('2026-10-12T12:00:00Z') }),
			],
			submissions: [
				submission({ studentId: 's-1', status: 'graded', marksObtained: '20', totalMarks: '20' }),
				submission({ homeworkId: 'h-2', studentId: 's-1', status: 'submitted' }),
				submission({ studentId: 's-2', status: 'graded', marksObtained: '10', totalMarks: '20' }),
			],
			homeworkRecipients: [],
		});

		const [ali, sara] = sheet.rows;
		// Set A (5 Oct) before Test 1 (10 Oct); Set B is handed in but not marked yet.
		expect(ali?.trend).toEqual([100, 80]);
		expect(ali?.overall).toEqual({ percentage: 90, grade: 'A+' });
		expect(ali?.homeworkAverage).toBe(100);
		expect(ali?.waitingCount).toBe(1);
		expect(ali?.homework['h-2']).toMatchObject({ status: 'submitted', percentage: null });

		expect(sara?.assessments['a-1']).toEqual({ status: 'absent', score: null, percentage: null });
		// No row for Set B means it was never handed in.
		expect(sara?.homework['h-2']).toMatchObject({ status: 'pending' });
		expect(sara?.overall).toEqual({ percentage: 50, grade: 'D' });

		expect(sheet.classAverage).toBe(70);
		expect(sheet.waitingCount).toBe(1);
	});

	it('leaves out work set for other students', () => {
		const sheet = buildMarksheet({
			sectionId: 'sec',
			subject: { id: 'sub', code: 'MATH', name: 'Maths' },
			students,
			assessments: [assessment({ assignMode: 'selected_students' })],
			assessmentResults: [],
			assessmentRecipients: [{ assessmentId: 'a-1', studentId: 's-2' }],
			homework: [homework({ assignMode: 'selected_students' })],
			submissions: [],
			homeworkRecipients: [{ homeworkId: 'h-1', studentId: 's-1' }],
		});

		expect(sheet.rows[0]?.assessments).toEqual({});
		expect(Object.keys(sheet.rows[0]?.homework ?? {})).toEqual(['h-1']);
		expect(Object.keys(sheet.rows[1]?.assessments ?? {})).toEqual(['a-1']);
		expect(sheet.rows[1]?.homework).toEqual({});
		expect(sheet.classAverage).toBeNull();
	});
});
