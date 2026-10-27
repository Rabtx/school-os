import { Module } from '@nestjs/common';

import { AccessScopeModule } from '@/modules/access-scope/access-scope.module';
import { AcademicModule } from '@/modules/academic/academic.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PermissionsModule } from '@/modules/authorization/permissions.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { StudentsModule } from '@/modules/students/students.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceService } from './attendance.service';

@Module({
	imports: [
		AccessScopeModule,
		AuthModule,
		PermissionsModule,
		MembershipsModule,
		TenantsModule,
		AcademicModule,
		StudentsModule,
		StaffModule,
	],
	controllers: [AttendanceController],
	providers: [AttendanceRepository, AttendanceService],
	exports: [AttendanceService, AttendanceRepository],
})
export class AttendanceModule {}
