import { Module } from '@nestjs/common';

import { AccessScopeModule } from '@/modules/access-scope/access-scope.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { MessagesController } from './messages.controller';
import { MessagesRepository } from './messages.repository';
import { MessagesService } from './messages.service';

@Module({
	imports: [AuthModule, MembershipsModule, TenantsModule, AccessScopeModule],
	controllers: [MessagesController],
	providers: [MessagesRepository, MessagesService],
	exports: [MessagesService],
})
export class MessagesModule {}
