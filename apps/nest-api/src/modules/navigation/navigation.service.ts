import { Injectable } from '@nestjs/common';

import type { NavigationItemRecord } from '@/database/schema';
import type { TenantContext } from '@/modules/tenants/tenant-context.types';
import { NavigationRepository } from './navigation.repository';
import type { NavigationNode, NavigationResponse, NavigationSection } from './navigation.types';

@Injectable()
export class NavigationService {
	constructor(private readonly navigation: NavigationRepository) {}

	async getAdminNavigation(tenant: TenantContext): Promise<NavigationResponse> {
		const rows = await this.navigation.listBySurface('admin');
		const permitted = this.filterByPermissions(rows, tenant.permissions, tenant.roles);
		return { sections: this.buildSections(permitted) };
	}

	private filterByPermissions(
		rows: NavigationItemRecord[],
		permissions: readonly string[],
		roles: readonly string[],
	): NavigationItemRecord[] {
		const permissionSet = new Set(permissions);
		const roleSet = new Set(roles);
		const allowed = rows.filter((item) => {
			if (item.visibleToRoles?.length) {
				const roleMatch = item.visibleToRoles.some((role) => roleSet.has(role));
				if (!roleMatch) return false;
			}
			return !item.requiredPermission || permissionSet.has(item.requiredPermission);
		});
		const allowedIds = new Set(allowed.map((item) => item.id));

		return allowed.filter((item) => !item.parentId || allowedIds.has(item.parentId));
	}

	private buildSections(rows: NavigationItemRecord[]): NavigationSection[] {
		const byId = new Map<string, NavigationNode>();
		for (const row of rows) {
			byId.set(row.id, {
				id: row.id,
				key: row.key,
				label: row.label,
				href: row.href,
				iconKey: row.iconKey,
				children: [],
			});
		}

		const roots: NavigationNode[] = [];
		for (const row of rows) {
			const node = byId.get(row.id);
			if (!node) continue;

			if (row.parentId) {
				const parent = byId.get(row.parentId);
				if (parent) parent.children.push(node);
				continue;
			}

			roots.push(node);
		}

		const sections = new Map<string, NavigationNode[]>();
		for (const row of rows.filter((item) => !item.parentId)) {
			const node = byId.get(row.id);
			if (!node) continue;
			const bucket = sections.get(row.sectionHeading) ?? [];
			bucket.push(node);
			sections.set(row.sectionHeading, bucket);
		}

		const sectionOrder = [
			...new Set(rows.filter((item) => !item.parentId).map((item) => item.sectionHeading)),
		];

		return sectionOrder.map((heading) => ({
			heading,
			items: (sections.get(heading) ?? []).toSorted((a, b) => {
				const aOrder = rows.find((row) => row.key === a.key)?.sortOrder ?? 0;
				const bOrder = rows.find((row) => row.key === b.key)?.sortOrder ?? 0;
				return aOrder - bOrder;
			}),
		}));
	}
}
