import { Injectable, NotFoundException } from '@nestjs/common';

import type { MembershipRecord } from '@/database/schema';
import { GuardiansRepository } from '@/modules/guardians/guardians.repository';
import { hasManagementRole } from '@/modules/memberships/membership-roles';
import { MembershipsService } from '@/modules/memberships/memberships.service';
import { StaffRepository } from '@/modules/staff/staff.repository';
import { StudentsRepository } from '@/modules/students/students.repository';

/**
 * Record scope: permissions say what a role may do, this says to whom. Management sees the whole
 * school, a teacher the students in their assigned sections, a parent their linked children and a
 * student only themselves. Every per-student read goes through here so the rule lives in one place.
 */
@Injectable()
export class AccessScopeService {
	constructor(
		private readonly memberships: MembershipsService,
		private readonly staff: StaffRepository,
		private readonly guardians: GuardiansRepository,
		private readonly students: StudentsRepository,
	) {}

	async canAccessStudent(
		tenantId: string,
		membership: MembershipRecord,
		studentId: string,
	): Promise<boolean> {
		const roles = await this.memberships.listRoleCodes(membership.id, membership.role);
		if (hasManagementRole(roles)) return true;
		if (
			roles.includes('teacher') &&
			(await this.staff.teacherCanAccessStudent(tenantId, membership.id, studentId))
		) {
			return true;
		}
		if (roles.includes('parent')) {
			const linked = await this.guardians.listLinkedStudentsForMembership(tenantId, membership.id);
			if (linked.some((row) => row.student.id === studentId)) return true;
		}
		if (roles.includes('student')) {
			const self = await this.students.findStudentByMembershipId(tenantId, membership.id);
			if (self?.id === studentId) return true;
		}
		return false;
	}

	/**
	 * The students a membership may see: `'all'` for management, otherwise the union over its roles
	 * (assigned sections, linked children, self). Use it to filter list endpoints.
	 */
	async listAccessibleStudentIds(
		tenantId: string,
		membership: MembershipRecord,
	): Promise<'all' | string[]> {
		const roles = await this.memberships.listRoleCodes(membership.id, membership.role);
		if (hasManagementRole(roles)) return 'all';

		const ids = new Set<string>();
		if (roles.includes('teacher')) {
			const sectionIds = await this.staff.listTeacherAssignedSectionIds(tenantId, membership.id);
			const rows = await this.students.listStudentsInSections(tenantId, sectionIds);
			for (const row of rows) ids.add(row.id);
		}
		if (roles.includes('parent')) {
			const linked = await this.guardians.listLinkedStudentsForMembership(tenantId, membership.id);
			for (const row of linked) ids.add(row.student.id);
		}
		if (roles.includes('student')) {
			const self = await this.students.findStudentByMembershipId(tenantId, membership.id);
			if (self) ids.add(self.id);
		}
		return [...ids];
	}

	/** Out-of-scope students read as not found, exactly like another school's student. */
	async requireStudentAccess(
		tenantId: string,
		membership: MembershipRecord,
		studentId: string,
	): Promise<void> {
		if (!(await this.canAccessStudent(tenantId, membership, studentId))) {
			throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Student not found' });
		}
	}
}
