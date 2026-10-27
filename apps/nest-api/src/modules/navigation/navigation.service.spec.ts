import { describe, expect, it, vi } from 'vitest';

import type { NavigationItemRecord } from '@/database/schema';
import { NavigationService } from './navigation.service';

function navRow(
	overrides: Partial<NavigationItemRecord> &
		Pick<NavigationItemRecord, 'id' | 'key' | 'label' | 'sectionHeading'>,
): NavigationItemRecord {
	return {
		href: null,
		iconKey: null,
		parentId: null,
		requiredPermission: null,
		visibleToRoles: null,
		sortOrder: 0,
		isEnabled: true,
		surface: 'admin',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function tenant(roles: string[]) {
	return { tenantId: 'tenant-1', permissions: [], roles } as never;
}

describe('NavigationService', () => {
	const service = new NavigationService({ listBySurface: async () => [] } as never);

	it('hides management-only items from teachers even when they have read permissions', () => {
		const rows: NavigationItemRecord[] = [
			navRow({
				id: '1',
				key: 'dashboard',
				label: 'Dashboard',
				href: '/admin',
				sectionHeading: 'Main Menu',
				sortOrder: 10,
			}),
			navRow({
				id: '2',
				key: 'students',
				label: 'Students',
				href: '/admin/students',
				sectionHeading: 'People',
				requiredPermission: 'students.read',
				visibleToRoles: ['owner', 'principal', 'admin'],
				sortOrder: 10,
			}),
			navRow({
				id: '3',
				key: 'my-classes',
				label: 'My classes',
				href: '/admin/my-classes',
				sectionHeading: 'Main Menu',
				requiredPermission: 'academic.read',
				visibleToRoles: ['teacher'],
				sortOrder: 25,
			}),
		];

		const filtered = (
			service as unknown as {
				filterByPermissions: (
					rows: NavigationItemRecord[],
					permissions: readonly string[],
					roles: readonly string[],
				) => NavigationItemRecord[];
			}
		).filterByPermissions(rows, ['students.read', 'academic.read'], ['teacher']);

		expect(filtered.map((item) => item.key)).toEqual(['dashboard', 'my-classes']);
	});

	it('shows management directories to admins', () => {
		const rows: NavigationItemRecord[] = [
			navRow({
				id: '1',
				key: 'students',
				label: 'Students',
				href: '/admin/students',
				sectionHeading: 'People',
				requiredPermission: 'students.read',
				visibleToRoles: ['owner', 'principal', 'admin'],
				sortOrder: 10,
			}),
		];

		const filtered = (
			service as unknown as {
				filterByPermissions: (
					rows: NavigationItemRecord[],
					permissions: readonly string[],
					roles: readonly string[],
				) => NavigationItemRecord[];
			}
		).filterByPermissions(rows, ['students.read'], ['admin']);

		expect(filtered.map((item) => item.key)).toEqual(['students']);
	});

	describe('getAdminNavigation', () => {
		const rows: NavigationItemRecord[] = [
			navRow({ id: 'a', key: 'account-profile', label: 'Profile', sectionHeading: 'Account' }),
			navRow({ id: 's', key: 'members', label: 'Members', sectionHeading: 'School' }),
			navRow({ id: 'p', key: 'students', label: 'Students', sectionHeading: 'Primary' }),
		];

		it('orders sections Primary, School, Account and adds counts for leadership', async () => {
			const countSidebarBadges = vi
				.fn()
				.mockResolvedValue({ students: 251, guardians: 238, homework: 6 });
			const nav = new NavigationService({
				listBySurface: async () => rows,
				countSidebarBadges,
				listActiveYearClasses: async () => [
					{
						sectionId: 'sec-1',
						campusId: 'campus-1',
						sectionName: 'A',
						className: 'Grade 7',
						studentCount: 31,
					},
				],
			} as never);

			const result = await nav.getAdminNavigation(tenant(['principal']));
			expect(result.classes).toEqual([
				{ sectionId: 'sec-1', campusId: 'campus-1', label: 'Grade 7 A', studentCount: 31 },
			]);

			expect(result.sections.map((section) => section.heading)).toEqual([
				'Primary',
				'School',
				'Account',
			]);
			expect(result.sections[0]?.items[0]?.count).toBe(251);
			expect(countSidebarBadges).toHaveBeenCalledWith('tenant-1', expect.any(Date));
		});

		it('does not load school-wide counts for other roles', async () => {
			const countSidebarBadges = vi.fn();
			const nav = new NavigationService({
				listBySurface: async () => rows,
				countSidebarBadges,
			} as never);

			const result = await nav.getAdminNavigation(tenant(['teacher']));

			expect(countSidebarBadges).not.toHaveBeenCalled();
			expect(result.classes).toEqual([]);
			expect(result.classes).toEqual([]);
			expect(result.sections[0]?.items[0]?.count).toBeUndefined();
		});
	});
});
