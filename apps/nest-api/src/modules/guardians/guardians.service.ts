import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { AccessScopeService } from '@/modules/access-scope/access-scope.service';
import { PermissionCodes } from '@/modules/authorization/permission-codes';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import type { TenantContext } from '@/modules/tenants/tenant-context.types';
import type {
	CreateGuardianInput,
	LinkStudentGuardianInput,
	UpdateGuardianInput,
} from './guardians.dto';
import { GuardiansRepository } from './guardians.repository';
import {
	toPublicGuardian,
	toPublicLinkedStudent,
	toPublicStudentGuardianLink,
} from './guardians.types';

@Injectable()
export class GuardiansService {
	constructor(
		private readonly guardians: GuardiansRepository,
		private readonly membershipAccess: MembershipsService,
		private readonly accessScope: AccessScopeService,
	) {}

	async listGuardians(userId: string, tenantId: string) {
		const membership = await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.GUARDIANS_READ,
		);
		const scope = await this.accessScope.listAccessibleStudentIds(tenantId, membership);
		const rows =
			scope === 'all'
				? await this.guardians.listGuardians(tenantId)
				: await this.guardians.listGuardiansForStudents(tenantId, scope);
		return { guardians: rows.map(toPublicGuardian) };
	}

	async createGuardian(userId: string, tenantId: string, input: CreateGuardianInput) {
		await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.GUARDIANS_WRITE,
		);
		const guardian = await this.guardians.createGuardian(
			this.normalizeGuardianInput(tenantId, input),
		);
		return { guardian: toPublicGuardian(guardian) };
	}

	async updateGuardian(
		userId: string,
		tenantId: string,
		guardianId: string,
		input: UpdateGuardianInput,
	) {
		await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.GUARDIANS_WRITE,
		);
		const guardian = await this.guardians.updateGuardian(tenantId, guardianId, {
			firstName: input.firstName?.trim(),
			lastName: input.lastName?.trim(),
			email: input.email?.trim(),
			phone: input.phone?.trim(),
			alternatePhone: input.alternatePhone?.trim(),
			addressLine1: input.addressLine1?.trim(),
			addressLine2: input.addressLine2?.trim(),
			city: input.city?.trim(),
			state: input.state?.trim(),
			postalCode: input.postalCode?.trim(),
			country: input.country?.trim(),
			occupation: input.occupation?.trim(),
			preferredChannel: input.preferredChannel,
			membershipId: input.membershipId,
		});
		if (!guardian) {
			throw new NotFoundException({
				code: 'GUARDIAN_NOT_FOUND',
				message: 'Guardian not found',
			});
		}
		return { guardian: toPublicGuardian(guardian) };
	}

	async listStudentGuardians(userId: string, tenantId: string, studentId: string) {
		const membership = await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.GUARDIANS_READ,
		);
		await this.accessScope.requireStudentAccess(tenantId, membership, studentId);
		const rows = await this.guardians.listStudentGuardians(tenantId, studentId);
		return { guardians: rows.map(toPublicStudentGuardianLink) };
	}

	async linkStudentGuardian(
		userId: string,
		tenantId: string,
		studentId: string,
		input: LinkStudentGuardianInput,
	) {
		await this.membershipAccess.requirePermission(
			userId,
			tenantId,
			PermissionCodes.GUARDIANS_WRITE,
		);
		let guardianId = input.guardianId;
		if (!guardianId && input.guardian) {
			const created = await this.guardians.createGuardian(
				this.normalizeGuardianInput(tenantId, input.guardian),
			);
			guardianId = created.id;
		}
		if (!guardianId) {
			throw new BadRequestException({
				code: 'GUARDIAN_REQUIRED',
				message: 'Guardian id or guardian details are required',
			});
		}
		const guardian = await this.guardians.findGuardianById(tenantId, guardianId);
		if (!guardian) {
			throw new NotFoundException({
				code: 'GUARDIAN_NOT_FOUND',
				message: 'Guardian not found',
			});
		}
		const link = await this.guardians.linkStudentGuardian({
			tenantId,
			studentId,
			guardianId,
			relationship: input.relationship,
			isPrimary: input.isPrimary ?? false,
			canPickup: input.canPickup ?? true,
			receivesNotifications: input.receivesNotifications ?? true,
		});
		return {
			link: {
				id: link.id,
				studentId: link.studentId,
				guardianId: link.guardianId,
				relationship: link.relationship,
				isPrimary: link.isPrimary,
				canPickup: link.canPickup,
				receivesNotifications: link.receivesNotifications,
				guardian: toPublicGuardian(guardian),
			},
		};
	}

	async getMyChildren(tenant: TenantContext) {
		if (!tenant.roles.includes('parent')) {
			return { children: [] as ReturnType<typeof toPublicLinkedStudent>[] };
		}
		const rows = await this.guardians.listLinkedStudentsForMembership(
			tenant.tenantId,
			tenant.membershipId,
		);
		return { children: rows.map(toPublicLinkedStudent) };
	}

	private normalizeGuardianInput(tenantId: string, input: CreateGuardianInput) {
		return {
			tenantId,
			membershipId: input.membershipId ?? null,
			firstName: input.firstName.trim(),
			lastName: input.lastName.trim(),
			email: input.email?.trim() ?? null,
			phone: input.phone?.trim() ?? null,
			alternatePhone: input.alternatePhone?.trim() ?? null,
			addressLine1: input.addressLine1?.trim() ?? null,
			addressLine2: input.addressLine2?.trim() ?? null,
			city: input.city?.trim() ?? null,
			state: input.state?.trim() ?? null,
			postalCode: input.postalCode?.trim() ?? null,
			country: input.country?.trim() ?? null,
			occupation: input.occupation?.trim() ?? null,
			preferredChannel: input.preferredChannel ?? 'phone',
		};
	}
}
