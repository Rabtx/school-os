import { Module } from '@nestjs/common';

import { AccessScopeModule } from '@/modules/access-scope/access-scope.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PermissionsModule } from '@/modules/authorization/permissions.module';
import { GuardiansModule } from '@/modules/guardians/guardians.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { StudentsModule } from '@/modules/students/students.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { HomeworkController } from './homework.controller';
import { HomeworkRepository } from './homework.repository';
import { HomeworkService } from './homework.service';
import { HomeworkSubmissionsRepository } from './homework-submissions.repository';
import { HomeworkSubmissionsService } from './homework-submissions.service';

@Module({
	imports: [
		AccessScopeModule,
		AuthModule,
		PermissionsModule,
		MembershipsModule,
		TenantsModule,
		GuardiansModule,
		StaffModule,
		StudentsModule,
	],
	controllers: [HomeworkController],
	providers: [
		HomeworkRepository,
		HomeworkService,
		HomeworkSubmissionsRepository,
		HomeworkSubmissionsService,
	],
	exports: [HomeworkService, HomeworkRepository, HomeworkSubmissionsService],
})
export class HomeworkModule {}
