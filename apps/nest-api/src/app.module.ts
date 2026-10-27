import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { ConfigModule } from '@/config/config.module';
import { DatabaseModule } from '@/database/database.module';
import { AcademicModule } from '@/modules/academic/academic.module';
import { AiModule } from '@/modules/ai/ai.module';
import { AssessmentsModule } from '@/modules/assessments/assessments.module';
import { AttendanceModule } from '@/modules/attendance/attendance.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { AuthorizationModule } from '@/modules/authorization/authorization.module';
import { BillingModule } from '@/modules/billing/billing.module';
import { CampusesModule } from '@/modules/campuses/campuses.module';
import { GradebookModule } from '@/modules/gradebook/gradebook.module';
import { GuardiansModule } from '@/modules/guardians/guardians.module';
import { HealthModule } from '@/modules/health/health.module';
import { HomeworkModule } from '@/modules/homework/homework.module';
import { MembersModule } from '@/modules/members/members.module';
import { NavigationModule } from '@/modules/navigation/navigation.module';
import { MaintenanceModule } from '@/modules/maintenance/maintenance.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { ProfilesModule } from '@/modules/profiles/profiles.module';
import { ReportsModule } from '@/modules/reports/reports.module';
import { StaffModule } from '@/modules/staff/staff.module';
import { StudentsModule } from '@/modules/students/students.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { TimetableModule } from '@/modules/timetable/timetable.module';
import { UsersModule } from '@/modules/users/users.module';

@Module({
	imports: [
		ConfigModule,
		DatabaseModule,
		ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
		HealthModule,
		UsersModule,
		AuthModule,
		ProfilesModule,
		BillingModule,
		TenantsModule,
		CampusesModule,
		AcademicModule,
		StudentsModule,
		AttendanceModule,
		NotificationsModule,
		MaintenanceModule,
		HomeworkModule,
		AssessmentsModule,
		GradebookModule,
		ReportsModule,
		MembersModule,
		NavigationModule,
		StaffModule,
		GuardiansModule,
		TimetableModule,
		AuthorizationModule,
		AiModule,
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
	],
})
export class AppModule {}
