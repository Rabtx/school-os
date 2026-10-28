import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
	imports: [AuthModule, TenantsModule],
	controllers: [AiController],
	providers: [AiService],
	exports: [AiService],
})
export class AiModule {}
