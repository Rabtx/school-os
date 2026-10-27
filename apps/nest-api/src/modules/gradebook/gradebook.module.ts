import { Module } from '@nestjs/common';

import { AccessScopeModule } from '@/modules/access-scope/access-scope.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PermissionsModule } from '@/modules/authorization/permissions.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { StudentsModule } from '@/modules/students/students.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { GradebookController } from './gradebook.controller';
import { GradebookRepository } from './gradebook.repository';
import { GradebookService } from './gradebook.service';

@Module({
	imports: [
		AccessScopeModule,
		AuthModule,
		PermissionsModule,
		MembershipsModule,
		TenantsModule,
		StaffModule,
		StudentsModule,
	],
	controllers: [GradebookController],
	providers: [GradebookRepository, GradebookService],
	exports: [GradebookService],
})
export class GradebookModule {}
