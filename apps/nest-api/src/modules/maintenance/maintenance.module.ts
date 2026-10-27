import { Module } from '@nestjs/common';

import { MaintenanceRepository } from './maintenance.repository';
import { MaintenanceService } from './maintenance.service';

@Module({
	providers: [MaintenanceRepository, MaintenanceService],
})
export class MaintenanceModule {}
