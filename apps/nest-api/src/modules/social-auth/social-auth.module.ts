import { Module } from '@nestjs/common';

import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { UsersModule } from '@/modules/users/users.module';
import { SocialAuthRepository } from './social-auth.repository';
import { SocialAuthService } from './social-auth.service';

@Module({
	imports: [UsersModule, MembershipsModule],
	providers: [SocialAuthRepository, SocialAuthService],
	exports: [SocialAuthService],
})
export class SocialAuthModule {}
