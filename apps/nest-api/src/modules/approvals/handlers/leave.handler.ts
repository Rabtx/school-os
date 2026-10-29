import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import * as z from 'zod';

import { markStatusSchema } from '@/modules/attendance/attendance.dto';
import { AttendanceService } from '@/modules/attendance/attendance.service';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import type { ApprovalFact, ApprovalHandler } from '../approval-handler';
import { LeaveContextRepository } from './leave-context.repository';
import { rangeLabel, schoolDaysBetween, shiftDate } from './school-days';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const LEAVE_REASONS = ['sick', 'family', 'travel', 'other'] as const;

const inputSchema = z
	.object({
		studentId: z.string().uuid(),
		fromDate: dateSchema,
		toDate: dateSchema,
		reason: z.enum(LEAVE_REASONS),
	})
	.strict()
	.refine((value) => value.fromDate <= value.toDate, {
		message: 'The last day comes after the first',
		path: ['toDate'],
	});

type Input = z.infer<typeof inputSchema>;
type MarkStatus = z.infer<typeof markStatusSchema>;

export type LeavePayload = Input & {
	studentName: string;
	sectionId: string;
	sectionName: string;
	campusId: string;
	days: string[];
	attendance: { marked: number; attended: number; excused: number };
	tests: { title: string; subject: string; on: string }[];
};

/** Longest leave a guardian can ask for in one request; longer absences go through the office. */
const MAX_SCHOOL_DAYS = 10;
/** How far back a guardian can still ask, e.g. for yesterday's sick day. */
const MAX_DAYS_BACK = 7;
const ATTENDANCE_LOOKBACK_DAYS = 90;

const REASON_LABEL: Record<Input['reason'], string> = {
	sick: 'Sick',
	family: 'Family',
	travel: 'Travel',
	other: 'Other',
};

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

function dayCount(days: string[]): string {
	return days.length === 1 ? '1 day' : `${days.length} days`;
}

/**
 * A guardian asks for leave for their child. Approving marks each school day excused on the
 * class roll call, as the approver; undo puts back the marks it replaced.
 */
@Injectable()
export class LeaveHandler implements ApprovalHandler<Input, LeavePayload> {
	readonly type = 'leave';
	readonly label = 'Leave';
	readonly inputSchema = inputSchema;

	constructor(
		private readonly attendance: AttendanceService,
		private readonly context: LeaveContextRepository,
		private readonly membershipAccess: MembershipsService,
	) {}

	async prepare(context: { userId: string; tenantId: string }, input: Input) {
		const membership = await this.membershipAccess.requireActiveMembership(
			context.userId,
			context.tenantId,
		);
		if (!(await this.context.isGuardianOf(context.tenantId, membership.id, input.studentId))) {
			throw new ForbiddenException({
				code: 'LEAVE_NOT_GUARDIAN',
				message: 'Only a guardian of this child can ask for leave.',
			});
		}
		if (input.fromDate < shiftDate(today(), -MAX_DAYS_BACK)) {
			throw new BadRequestException({
				code: 'LEAVE_TOO_LATE',
				message: `Leave can be asked for up to ${MAX_DAYS_BACK} days back. Call the office for older days.`,
			});
		}
		const days = schoolDaysBetween(input.fromDate, input.toDate);
		if (days.length === 0) {
			throw new BadRequestException({
				code: 'LEAVE_NO_SCHOOL_DAYS',
				message: 'Those dates fall on a weekend.',
			});
		}
		if (days.length > MAX_SCHOOL_DAYS) {
			throw new BadRequestException({
				code: 'LEAVE_TOO_LONG',
				message: `Ask for up to ${MAX_SCHOOL_DAYS} school days at a time.`,
			});
		}
		const found = await this.attendance.findStudentClass(context.tenantId, input.studentId);
		if (!found) {
			throw new BadRequestException({
				code: 'STUDENT_NOT_ENROLLED',
				message: 'This child is not in a class yet.',
			});
		}
		const [attendance, tests] = await Promise.all([
			this.context.attendanceSince(
				context.tenantId,
				input.studentId,
				shiftDate(today(), -ATTENDANCE_LOOKBACK_DAYS),
			),
			this.context.listTestsInRange(
				context.tenantId,
				found.sectionId,
				input.fromDate,
				input.toDate,
			),
		]);
		return {
			payload: { ...input, ...found, days, attendance, tests },
			dedupeKey: `leave:${input.studentId}:${input.fromDate}:${input.toDate}`,
			risk: tests.length > 0 || days.length > 3 ? ('medium' as const) : ('low' as const),
			approverRole: 'leadership' as const,
			// After the last day there is nothing left to decide; the marks stay as they are.
			expiresAt: new Date(`${shiftDate(input.toDate, 1)}T00:00:00Z`),
		};
	}

	describe(payload: LeavePayload) {
		const range = rangeLabel(payload.fromDate, payload.toDate);
		const { marked, attended, excused } = payload.attendance;
		const facts: ApprovalFact[] = [
			{
				label: 'Attendance',
				value:
					marked === 0
						? 'No marks yet this term'
						: `${Math.round((attended / marked) * 100)}% recently${excused === 0 ? ', no leave before' : `, ${excused} excused ${excused === 1 ? 'day' : 'days'}`}`,
			},
			{
				label: 'Tests on these days',
				value:
					payload.tests.length === 0
						? 'None'
						: payload.tests.map((test) => `${test.subject}: ${test.title}`).join(', '),
			},
			{ label: 'Reason', value: REASON_LABEL[payload.reason] },
		];
		return {
			title: `Leave for ${payload.studentName}`,
			subtitle: `${payload.sectionName} · ${range} · ${dayCount(payload.days)}`,
			quote: null,
			noteLabel: 'Message from the guardian',
			facts,
			outcome: `If you approve: ${dayCount(payload.days)} ${payload.days.length === 1 ? 'is' : 'are'} marked excused on the ${payload.sectionName} roll call, and the guardian sees it on My children.`,
			approveLabel: 'Approve leave',
			declineTitle: 'Say no to this leave?',
			declineReasons: ['Exam week', 'Too many away that day', 'Needs a note first', 'Other'],
		};
	}

	async apply(context: { tenantId: string; approver: { id: string } }, payload: LeavePayload) {
		const replaced: { date: string; status: MarkStatus | null }[] = [];
		for (const date of payload.days) {
			// oxlint-disable-next-line no-await-in-loop -- one roll call per day, in order
			const status = await this.attendance.setMarkOnDay({
				tenantId: context.tenantId,
				sectionId: payload.sectionId,
				campusId: payload.campusId,
				studentId: payload.studentId,
				sessionDate: date,
				status: 'excused',
				approverMembershipId: context.approver.id,
			});
			replaced.push({ date, status });
		}
		return {
			headline: `${payload.studentName} is excused ${payload.days.length === 1 ? 'on' : 'from'} ${rangeLabel(payload.fromDate, payload.toDate)}.`,
			facts: [
				{ label: 'Attendance', value: `${dayCount(payload.days)} marked excused` },
				{ label: 'Class teacher', value: `Sees it on the ${payload.sectionName} roll call` },
				{ label: 'Guardian', value: 'Sees it approved on My children' },
			],
			undo: { replaced },
		};
	}

	async undo(
		context: { tenantId: string; approver: { id: string } },
		payload: LeavePayload,
		undo: Record<string, unknown>,
	) {
		const replaced = z
			.array(z.object({ date: dateSchema, status: markStatusSchema.nullable() }))
			.parse(undo.replaced);
		for (const { date, status } of replaced) {
			// oxlint-disable-next-line no-await-in-loop -- one roll call per day, in order
			await this.attendance.setMarkOnDay({
				tenantId: context.tenantId,
				sectionId: payload.sectionId,
				campusId: payload.campusId,
				studentId: payload.studentId,
				sessionDate: date,
				status,
				approverMembershipId: context.approver.id,
			});
		}
	}

	expired(payload: LeavePayload) {
		return {
			summary: `Nobody decided before ${rangeLabel(payload.fromDate, payload.toDate)} passed, so the days stay as the teacher marked them.`,
			facts: [{ label: 'Attendance', value: 'Kept as marked, not excused' }],
		};
	}

	declined(payload: LeavePayload, reason: string) {
		return `Leave for ${payload.studentName} (${rangeLabel(payload.fromDate, payload.toDate)}) was not approved. Reason: ${reason}`;
	}
}
