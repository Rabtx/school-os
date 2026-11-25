import {
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';

import { MembershipsRepository } from '@/modules/memberships/memberships.repository';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import type { CreateTenantInput, UpdateTenantInput } from './tenants.dto';
import { TenantsRepository } from './tenants.repository';
import { toPublicTenant } from './tenants.types';

// A school owner rarely runs more than a handful of organizations; the cap bounds tenant-creation
// abuse alongside the controller's rate limit (S-58).
const MAX_OWNED_ACTIVE_TENANTS = 5;
const MAX_SLUG_RETRIES = 5;

@Injectable()
export class TenantsService {
	constructor(
		private readonly tenants: TenantsRepository,
		private readonly memberships: MembershipsRepository,
		private readonly membershipAccess: MembershipsService,
	) {}

	async create(userId: string, input: CreateTenantInput) {
		await this.assertUnderOwnedTenantCap(userId);
		const slug = await this.resolveUniqueSlug(input.name, input.slug);
		const tenant = await this.createWithSlugRetry(userId, input, slug);
		return { tenant: toPublicTenant(tenant) };
	}

	async listForUser(userId: string) {
		const tenantIds = await this.memberships.listActiveTenantIdsForUser(userId);
		const rows = await this.tenants.listByIds(tenantIds);
		return { tenants: rows.map(toPublicTenant) };
	}

	async getForUser(userId: string, tenantId: string) {
		await this.membershipAccess.requireActiveMembership(userId, tenantId);
		const tenant = await this.requireTenant(tenantId);
		return { tenant: toPublicTenant(tenant) };
	}

	async update(userId: string, tenantId: string, input: UpdateTenantInput) {
		await this.membershipAccess.requireManagementAccess(userId, tenantId);
		const tenant = await this.tenants.update(tenantId, {
			name: input.name?.trim(),
			mission: input.mission === undefined ? undefined : (input.mission?.trim() ?? null),
			timezone: input.timezone,
			defaultLocale: input.defaultLocale,
			status: input.status,
		});
		if (!tenant) {
			throw new NotFoundException({
				code: 'TENANT_NOT_FOUND',
				message: 'Tenant not found',
			});
		}
		return { tenant: toPublicTenant(tenant) };
	}

	private async assertUnderOwnedTenantCap(userId: string) {
		const ownedActive = await this.memberships.countActiveOwnedTenantsForUser(userId);
		if (ownedActive >= MAX_OWNED_ACTIVE_TENANTS) {
			throw new ForbiddenException({
				code: 'TENANT_CREATION_LIMIT',
				message: `You can own at most ${MAX_OWNED_ACTIVE_TENANTS} active organizations`,
			});
		}
	}

	private async createWithSlugRetry(userId: string, input: CreateTenantInput, slug: string) {
		// `resolveUniqueSlug` probed for a free slug, but a concurrent create can claim it first; the
		// `tenants_slug_unique` index is the authority. Retry with the next suffix instead of
		// surfacing a 500 (S-52).
		let candidate = slug;
		for (let attempt = 0; attempt <= MAX_SLUG_RETRIES; attempt += 1) {
			try {
				// oxlint-disable-next-line no-await-in-loop -- each retry depends on the previous insert failing
				return await this.tenants.createWithOwnerMembership({
					tenant: {
						name: input.name.trim(),
						slug: candidate,
						mission: input.mission?.trim() ?? null,
						timezone: input.timezone ?? 'Asia/Karachi',
						defaultLocale: input.defaultLocale ?? 'en',
					},
					userId,
				});
			} catch (error) {
				// The only unique constraint this insert can hit is the tenant slug.
				if (!isUniqueViolation(error)) throw error;
				candidate = nextSlugCandidate(candidate);
			}
		}
		throw new ConflictException({
			code: 'TENANT_SLUG_CONFLICT',
			message: 'Could not allocate a unique tenant slug',
		});
	}

	private async requireTenant(tenantId: string) {
		const tenant = await this.tenants.findById(tenantId);
		if (!tenant) {
			throw new NotFoundException({
				code: 'TENANT_NOT_FOUND',
				message: 'Tenant not found',
			});
		}
		return tenant;
	}

	private async resolveUniqueSlug(name: string, preferred?: string) {
		const base = preferred ? slugify(preferred) : slugify(name);
		if (!base) {
			throw new ConflictException({
				code: 'TENANT_SLUG_INVALID',
				message: 'Could not derive a valid slug from tenant name',
			});
		}

		let candidate = base;
		let suffix = 2;
		// oxlint-disable-next-line no-await-in-loop -- probes slugs until a free one is found
		while (await this.tenants.slugExists(candidate)) {
			candidate = `${base}-${suffix}`;
			suffix += 1;
		}
		return candidate;
	}
}

function slugify(value: string) {
	return (
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			// Runs are already collapsed to one dash, so a single-character trim is enough (and linear).
			.replace(/^-|-$/g, '')
			.slice(0, 72)
	);
}

// Continues the `base-2`, `base-3`, … sequence `resolveUniqueSlug` starts; already-suffixed
// candidates become `base-3` and so on, which is unique-safe because the index rejects repeats.
function nextSlugCandidate(candidate: string) {
	const match = /^(.*-)(\d+)$/.exec(candidate);
	const base = match ? match[1] : `${candidate}-`;
	const suffix = match ? Number(match[2]) + 1 : 2;
	return `${base}${suffix}`;
}

function isUniqueViolation(error: unknown): boolean {
	const code = (error as { code?: string; cause?: { code?: string } } | null)?.code;
	const causeCode = (error as { cause?: { code?: string } } | null)?.cause?.code;
	return code === '23505' || causeCode === '23505';
}
