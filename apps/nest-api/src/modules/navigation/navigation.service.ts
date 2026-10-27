import { Injectable } from '@nestjs/common';

import type { NavigationItemRecord } from '@/database/schema';
import { hasManagementRole } from '@/modules/memberships/membership-roles';
import type { TenantContext } from '@/modules/tenants/tenant-context.types';
import { NavigationRepository } from './navigation.repository';
import type { NavigationNode, NavigationResponse, NavigationSection } from './navigation.types';

/** Sidebar section order (Figma): primary items, then running the school, then the user menu. */
const SECTION_ORDER = ['Primary', 'School', 'Account'];

function sectionRank(heading: string): number {
	const index = SECTION_ORDER.indexOf(heading);
	return index === -1 ? SECTION_ORDER.length : index;
}

@Injectable()
export class NavigationService {
	constructor(private readonly navigation: NavigationRepository) {}

	async getAdminNavigation(tenant: TenantContext): Promise<NavigationResponse> {
		const rows = await this.navigation.listBySurface('admin');
		const permitted = this.filterByPermissions(rows, tenant.permissions, tenant.roles);
		const sections = this.buildSections(permitted);
		if (!hasManagementRole([...tenant.roles])) {
			return { sections, classes: [] };
		}

		const [counts, classRows] = await Promise.all([
			this.navigation.countSidebarBadges(tenant.tenantId, new Date()),
			this.navigation.listActiveYearClasses(tenant.tenantId),
		]);
		for (const node of sections.flatMap((section) => section.items)) {
			if (node.key in counts) node.count = counts[node.key as keyof typeof counts];
		}
		return {
			sections,
			classes: classRows.map((row) => ({
				sectionId: row.sectionId,
				campusId: row.campusId,
				label: row.sectionName.startsWith(row.className)
					? row.sectionName
					: `${row.className} ${row.sectionName}`,
				studentCount: row.studentCount,
			})),
		};
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
		].toSorted((a, b) => sectionRank(a) - sectionRank(b));

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
