import { Module } from '@nestjs/common';

import { AssessmentsModule } from '@/modules/assessments/assessments.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsRegistry } from './approvals.registry';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';
import { AttendanceChangeHandler } from './handlers/attendance-change.handler';
import { LeaveContextRepository } from './handlers/leave-context.repository';
import { LeaveHandler } from './handlers/leave.handler';
import { MarksChangeHandler } from './handlers/marks-change.handler';

@Module({
	imports: [AuthModule, MembershipsModule, TenantsModule, AttendanceModule, AssessmentsModule],
	controllers: [ApprovalsController],
	providers: [
		ApprovalsRepository,
		ApprovalsRegistry,
		ApprovalsService,
		AttendanceChangeHandler,
		LeaveContextRepository,
		LeaveHandler,
		MarksChangeHandler,
	],
	exports: [ApprovalsService],
})
export class ApprovalsModule {}
