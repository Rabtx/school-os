import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/modules/auth/current-user.decorator';
import type { AccessTokenPayload } from '@/modules/auth/auth.types';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { MembershipsRepository } from '@/modules/memberships/memberships.repository';

import { PermissionsService } from './permissions.service';

@ApiTags('Authorization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'permissions', version: '1' })
export class PermissionsController {
	constructor(
		private readonly permissions: PermissionsService,
		private readonly memberships: MembershipsRepository,
	) {}

	@Get()
	@ApiOperation({ summary: 'List the global permission catalog' })
	async list(@CurrentUser() user: AccessTokenPayload) {
		// The catalog lists every permission the platform can grant; restrict it to management roles
		// so it cannot be used to map attack targets (S-38). Clients get their own permissions from
		// the tenant context, so nothing else needs this endpoint.
		const canViewCatalog = await this.memberships.hasActiveManagementRoleForUser(user.sub);
		if (!canViewCatalog) {
			throw new ForbiddenException({
				code: 'PERMISSION_DENIED',
				message: 'Only management roles can view the permission catalog',
			});
		}
		const rows = await this.permissions.listCatalog();
		return {
			permissions: rows.map((permission) => ({
				id: permission.id,
				code: permission.code,
				module: permission.module,
				description: permission.description,
			})),
		};
	}
}
