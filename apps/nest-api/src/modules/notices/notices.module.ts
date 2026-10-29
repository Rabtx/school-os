import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { MembershipsModule } from '@/modules/memberships/memberships.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { NoticesController } from './notices.controller';
import { NoticesRepository } from './notices.repository';
import { NoticesService } from './notices.service';

@Module({
	imports: [AuthModule, MembershipsModule, TenantsModule, StaffModule],
	controllers: [NoticesController],
	providers: [NoticesRepository, NoticesService],
	exports: [NoticesService],
})
export class NoticesModule {}
