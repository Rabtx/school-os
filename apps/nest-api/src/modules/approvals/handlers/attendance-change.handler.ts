import { BadRequestException, Injectable } from '@nestjs/common';
import * as z from 'zod';

import { markStatusSchema } from '@/modules/attendance/attendance.dto';
import { AttendanceService } from '@/modules/attendance/attendance.service';
import type { ApprovalHandler } from '../approval-handler';

const inputSchema = z
	.object({
		sessionId: z.string().uuid(),
		studentId: z.string().uuid(),
		status: markStatusSchema.exclude(['unknown']),
	})
	.strict();

type Input = z.infer<typeof inputSchema>;
type MarkStatus = z.infer<typeof markStatusSchema>;

export type AttendanceChangePayload = Input & {
	sessionDate: string;
	sectionId: string;
	sectionName: string;
	studentName: string;
	previousStatus: MarkStatus | null;
};

/** Requests nobody decides within a week drop out of the queue; the mark stays as it was. */
const EXPIRES_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

const STATUS_LABEL: Record<MarkStatus, string> = {
	present: 'Present',
	absent: 'Absent',
	late: 'Late',
	excused: 'Excused',
	left_early: 'Left early',
	unknown: 'Not marked',
};

export function statusLabel(status: MarkStatus | null): string {
	return STATUS_LABEL[status ?? 'unknown'];
}

/** "2026-10-26" → "Mon 26 Oct", read in UTC so the school day never shifts. */
export function dayLabel(isoDate: string): string {
	return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC',
	});
}

/**
 * A teacher asks to change one student's mark on a day the edit window has closed. Approving sets
 * the mark as the approver; undo puts back the mark it replaced.
 */
@Injectable()
export class AttendanceChangeHandler implements ApprovalHandler<Input, AttendanceChangePayload> {
	readonly type = 'attendance_change';
	readonly label = 'Attendance';
	readonly inputSchema = inputSchema;

	constructor(private readonly attendance: AttendanceService) {}

	async prepare(context: { userId: string; tenantId: string }, input: Input) {
		const found = await this.attendance.prepareChangeRequest(
			context.userId,
			context.tenantId,
			input,
		);
		if (found.canEditNow) {
			throw new BadRequestException({
				code: 'APPROVAL_NOT_NEEDED',
				message: 'You can still change this mark yourself on the roll call.',
			});
		}
		if (found.previousStatus === input.status) {
			throw new BadRequestException({
				code: 'APPROVAL_NO_CHANGE',
				message: `${found.studentName} is already marked ${statusLabel(input.status).toLowerCase()}.`,
			});
		}
		return {
			payload: {
				...input,
				sessionDate: found.sessionDate,
				sectionId: found.sectionId,
				sectionName: found.sectionName,
				studentName: found.studentName,
				previousStatus: found.previousStatus,
			},
			dedupeKey: `attendance:${input.sessionId}:${input.studentId}`,
			risk: 'low' as const,
			approverRole: 'leadership' as const,
			expiresAt: new Date(Date.now() + EXPIRES_AFTER_MS),
		};
	}

	describe(payload: AttendanceChangePayload) {
		const from = statusLabel(payload.previousStatus);
		const to = statusLabel(payload.status);
		return {
			title: `Mark ${payload.studentName} ${to.toLowerCase()}`,
			subtitle: `${payload.sectionName} · ${dayLabel(payload.sessionDate)} · roll call closed`,
			quote: null,
			facts: [
				{ label: 'Marked now', value: from },
				{ label: 'Change to', value: to },
			],
			outcome: `If you approve: ${payload.studentName} is marked ${to.toLowerCase()} for ${dayLabel(payload.sessionDate)} and the change is kept in the audit log.`,
			approveLabel: 'Approve change',
			declineTitle: 'Say no to this change?',
			declineReasons: ['Mark was right', 'Needs a note first', 'Other'],
		};
	}

	async apply(
		context: { tenantId: string; approver: { id: string } },
		payload: AttendanceChangePayload,
	) {
		const replaced = await this.attendance.applyApprovedChange({
			tenantId: context.tenantId,
			sessionId: payload.sessionId,
			studentId: payload.studentId,
			status: payload.status,
			approverMembershipId: context.approver.id,
		});
		return {
			headline: `${payload.studentName} is marked ${statusLabel(payload.status).toLowerCase()} for ${dayLabel(payload.sessionDate)}.`,
			facts: [
				{
					label: 'Attendance',
					value: `${statusLabel(replaced)} → ${statusLabel(payload.status)}`,
				},
				{ label: 'Teacher', value: 'Sees the change on the roll call' },
			],
			undo: { status: replaced },
		};
	}

	async undo(
		context: { tenantId: string; approver: { id: string } },
		payload: AttendanceChangePayload,
		undo: Record<string, unknown>,
	) {
		const status = markStatusSchema.nullable().parse(undo.status ?? null);
		await this.attendance.applyApprovedChange({
			tenantId: context.tenantId,
			sessionId: payload.sessionId,
			studentId: payload.studentId,
			status,
			approverMembershipId: context.approver.id,
		});
	}

	expired(payload: AttendanceChangePayload) {
		return {
			summary: `Nobody decided within a week, so ${payload.studentName} stays ${statusLabel(payload.previousStatus).toLowerCase()} for ${dayLabel(payload.sessionDate)}.`,
			facts: [{ label: 'Attendance', value: `Kept as ${statusLabel(payload.previousStatus)}` }],
		};
	}

	declined(payload: AttendanceChangePayload, reason: string) {
		return `${payload.studentName} stays ${statusLabel(payload.previousStatus).toLowerCase()} for ${dayLabel(payload.sessionDate)}. Reason: ${reason}`;
	}
}
