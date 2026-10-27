import { Module } from '@nestjs/common';

import { GuardiansRepository } from '@/modules/guardians/guardians.repository';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { StudentsRepository } from '@/modules/students/students.repository';
import { AccessScopeService } from './access-scope.service';

/**
 * Provides the repositories it reads instead of importing StudentsModule or GuardiansModule, so those
 * modules (and every other feature module) can import this one without a cycle.
 */
@Module({
	imports: [MembershipsModule, StaffModule],
	providers: [AccessScopeService, GuardiansRepository, StudentsRepository],
	exports: [AccessScopeService],
})
export class AccessScopeModule {}
