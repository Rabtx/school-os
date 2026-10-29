import { BadRequestException, Injectable } from '@nestjs/common';

import type { ApprovalHandler } from './approval-handler';
import { AttendanceChangeHandler } from './handlers/attendance-change.handler';
import { LeaveHandler } from './handlers/leave.handler';
import { MarksChangeHandler } from './handlers/marks-change.handler';
import { NoticeHandler } from './handlers/notice.handler';

/** Every request type the engine knows, by `type`. New types register here. */
@Injectable()
export class ApprovalsRegistry {
	private readonly handlers: Map<string, ApprovalHandler>;

	constructor(
		attendanceChange: AttendanceChangeHandler,
		leave: LeaveHandler,
		marksChange: MarksChangeHandler,
		notice: NoticeHandler,
	) {
		this.handlers = new Map(
			([attendanceChange, leave, marksChange, notice] as ApprovalHandler[]).map((handler) => [
				handler.type,
				handler,
			]),
		);
	}

	get(type: string): ApprovalHandler {
		const handler = this.handlers.get(type);
		if (!handler) {
			throw new BadRequestException({
				code: 'APPROVAL_TYPE_UNKNOWN',
				message: `Unknown approval type ${type}`,
			});
		}
		return handler;
	}

	types(): string[] {
		return [...this.handlers.keys()];
	}
}
