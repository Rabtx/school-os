import { Module } from '@nestjs/common';

import { AuthModule } from '@/modules/auth/auth.module';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { TimetableController } from './timetable.controller';
import { TimetableRepository } from './timetable.repository';
import { TimetableService } from './timetable.service';

@Module({
	imports: [AuthModule, TenantsModule],
	controllers: [TimetableController],
	// StaffRepository is provided here, not imported: StaffModule already imports this module.
	providers: [StaffRepository, TimetableRepository, TimetableService],
	exports: [TimetableService, TimetableRepository],
})
export class TimetableModule {}
