import { Module } from '@nestjs/common';

import { AccessScopeModule } from '@/modules/access-scope/access-scope.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { PermissionsModule } from '@/modules/authorization/permissions.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { GuardiansController } from './guardians.controller';
import { GuardiansRepository } from './guardians.repository';
import { GuardiansService } from './guardians.service';

@Module({
	imports: [AccessScopeModule, AuthModule, PermissionsModule, MembershipsModule, TenantsModule],
	controllers: [GuardiansController],
	providers: [GuardiansRepository, GuardiansService],
	exports: [GuardiansService, GuardiansRepository],
})
export class GuardiansModule {}
