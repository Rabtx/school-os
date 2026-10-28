import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { PermissionsModule } from '@/modules/authorization/permissions.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { RulesController } from './rules.controller';
import { RulesRepository } from './rules.repository';
import { RulesService } from './rules.service';

@Module({
	imports: [AuthModule, PermissionsModule, MembershipsModule, TenantsModule],
	controllers: [RulesController],
	providers: [RulesRepository, RulesService],
	exports: [RulesService],
})
export class RulesModule {}
