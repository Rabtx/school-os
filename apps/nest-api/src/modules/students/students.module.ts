import { Module } from '@nestjs/common';

import { AcademicModule } from '@/modules/academic/academic.module';
import { AccessScopeModule } from '@/modules/access-scope/access-scope.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PermissionsModule } from '@/modules/authorization/permissions.module';
import { CampusesModule } from '@/modules/campuses/campuses.module';
import { GuardiansModule } from '@/modules/guardians/guardians.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { StudentPhotoStorageService } from './student-photo-storage.service';
import { StudentsController } from './students.controller';
import { StudentsRepository } from './students.repository';
import { StudentsService } from './students.service';

@Module({
	imports: [
		AccessScopeModule,
		AuthModule,
		PermissionsModule,
		MembershipsModule,
		TenantsModule,
		CampusesModule,
		AcademicModule,
		GuardiansModule,
		StaffModule,
	],
	controllers: [StudentsController],
	providers: [StudentsRepository, StudentsService, StudentPhotoStorageService],
	exports: [StudentsService, StudentsRepository],
})
export class StudentsModule {}
