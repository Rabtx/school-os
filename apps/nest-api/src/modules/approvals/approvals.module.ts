import { Module } from '@nestjs/common';

import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { ApprovalsController } from './approvals.controller';
import { ApprovalsRegistry } from './approvals.registry';
import { ApprovalsRepository } from './approvals.repository';
import { ApprovalsService } from './approvals.service';
import { AttendanceChangeHandler } from './handlers/attendance-change.handler';

@Module({
	imports: [AuthModule, MembershipsModule, TenantsModule, AttendanceModule],
	controllers: [ApprovalsController],
	providers: [ApprovalsRepository, ApprovalsRegistry, ApprovalsService, AttendanceChangeHandler],
	exports: [ApprovalsService],
})
export class ApprovalsModule {}
