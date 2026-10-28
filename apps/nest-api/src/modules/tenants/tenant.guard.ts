import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '@/modules/auth/jwt-auth.guard';
import { PermissionsService } from '@/modules/authorization/permissions.service';
import { MembershipsService } from '@/modules/memberships/memberships.service';

import type { TenantContext } from './tenant-context.types';
import { TenantsRepository } from './tenants.repository';

export type TenantScopedRequest = AuthenticatedRequest & { tenant?: TenantContext };

@Injectable()
export class TenantGuard implements CanActivate {
	constructor(
		private readonly memberships: MembershipsService,
		private readonly permissions: PermissionsService,
		private readonly tenantsRepository: TenantsRepository,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<TenantScopedRequest>();
		if (!request.user) {
			throw new UnauthorizedException({
				code: 'AUTH_REQUIRED',
				message: 'Authentication required',
			});
		}

		// Fail closed: a route guarded by TenantGuard must name its tenant in the path. Letting a
		// request through without one would skip the membership check entirely.
		const tenantId = request.params.tenantId;
		if (typeof tenantId !== 'string' || !tenantId) {
			throw new ForbiddenException({
				code: 'TENANT_REQUIRED',
				message: 'This route must be called with a tenant',
			});
		}

		// The path tenant does not have to be the token's active tenant (`tid`): someone who belongs
		// to two schools can read either without switching. What protects the data is this check, an
		// active membership in the path tenant on every request, and roles are loaded for that tenant.
		const membership = await this.memberships.requireActiveMembership(request.user.sub, tenantId);

		const tenant = await this.tenantsRepository.findById(tenantId);
		if (!tenant || !this.tenantsRepository.isActive(tenant)) {
			throw new ForbiddenException({
				code: 'TENANT_INACTIVE',
				message: 'This organization is suspended or no longer active',
			});
		}

		const roleRows = await this.memberships.listRolesForMembership(membership.id);
		const roles =
			roleRows.length > 0 ? roleRows.map((row) => row.role) : ([membership.role] as const);
		request.tenant = {
			tenantId: membership.tenantId,
			membershipId: membership.id,
			userId: request.user.sub,
			role: membership.role,
			roles,
			campusId: membership.campusId,
			permissions: this.permissions.getPermissionsForRoles(roles),
		};
		return true;
	}
}
