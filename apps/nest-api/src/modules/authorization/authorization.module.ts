import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';

import { PermissionsController } from './permissions.controller';
import { PermissionsModule } from './permissions.module';

@Module({
	imports: [PermissionsModule, AuthModule, MembershipsModule],
	controllers: [PermissionsController],
})
export class AuthorizationModule {}
