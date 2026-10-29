import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MembershipsService } from '@/modules/memberships/memberships.service';
import type { StaffRepository } from '@/modules/staff/staff.repository';
import { audienceLabel } from './notice-audience';
import type { NoticesRepository } from './notices.repository';
import { NoticesService } from './notices.service';

const principal = { id: 'principal-m', role: 'principal' as const };
const teacher = { id: 'teacher-m', role: 'teacher' as const };

function noticeRow(overrides: Record<string, unknown> = {}) {
	return {
		notice: {
			id: 'notice-1',
			title: 'Parent-teacher meeting',
			body: 'Sat 24 Oct, 9 AM in the school hall.',
			audience: { kind: 'sections', sectionIds: ['s-7a'] },
			status: 'draft',
			createdByMembershipId: 'teacher-m',
			createdAt: new Date('2026-10-29T08:00:00Z'),
			sentAt: null,
			recipientCount: 0,
			...overrides,
		},
		authorName: 'Sana Iqbal',
		readCount: 0,
		onAppCount: 0,
	};
}

describe('NoticesService', () => {
	let repository: Record<string, ReturnType<typeof vi.fn>>;
	let memberships: Record<string, ReturnType<typeof vi.fn>>;
	let staff: Record<string, ReturnType<typeof vi.fn>>;
	let service: NoticesService;

	function signedInAs(membership: { id: string; role: string }) {
		memberships.requireActiveMembership.mockResolvedValue(membership);
		memberships.listRoleCodes.mockResolvedValue([membership.role]);
	}

	beforeEach(() => {
		repository = {
			findById: vi.fn(async () => noticeRow()),
			list: vi.fn(async () => [noticeRow({ status: 'sent', recipientCount: 10 })]),
			countByStatus: vi.fn(async () => [{ status: 'sent', count: 1 }]),
			create: vi.fn(async () => ({ id: 'notice-1' })),
			update: vi.fn(async () => ({ ...noticeRow().notice, status: 'pending_approval' })),
			deleteDraft: vi.fn(async () => true),
			resolveRecipients: vi.fn(async () => ({
				guardians: [
					{ guardianId: 'g1', membershipId: 'parent-m' },
					{ guardianId: 'g2', membershipId: null },
				],
				staff: [{ membershipId: 'parent-m' }, { membershipId: 'teacher-m' }],
			})),
			sectionNames: vi.fn(async () => [{ id: 's-7a', name: '7-A' }]),
			sectionOptions: vi.fn(async () => []),
			send: vi.fn(async () => ({ recipientCount: 3 })),
			unsend: vi.fn(async () => ({})),
			inbox: vi.fn(async () => []),
			markRead: vi.fn(async () => 1),
		};
		memberships = { requireActiveMembership: vi.fn(), listRoleCodes: vi.fn() };
		staff = { listTeacherAssignedSectionIds: vi.fn(async () => ['s-7a']) };
		service = new NoticesService(
			repository as unknown as NoticesRepository,
			memberships as unknown as MembershipsService,
			staff as unknown as StaffRepository,
		);
	});

	it('labels audiences', () => {
		expect(audienceLabel({ kind: 'all_parents' })).toBe('All parents');
		expect(audienceLabel({ kind: 'sections', sectionIds: ['a', 'b'] }, ['7-A', '7-B'])).toBe(
			'Parents of 7-A, 7-B',
		);
		expect(audienceLabel({ kind: 'everyone' })).toBe('Everyone');
	});

	it('counts reach once per person: a staff member who is also a parent counts as the parent', async () => {
		signedInAs(principal);
		const result = await service.previewAudience('u', 't', { kind: 'everyone' });
		expect(result.reach).toEqual({ parents: 2, parentsOnApp: 1, staff: 1, total: 3 });
	});

	it('lets teachers write only to the parents of their own classes', async () => {
		signedInAs(teacher);
		await expect(
			service.create('u', 't', { title: 'x', body: 'y', audience: { kind: 'all_parents' } }),
		).rejects.toMatchObject({ response: { code: 'NOTICE_AUDIENCE_FORBIDDEN' } });
		await expect(
			service.create('u', 't', {
				title: 'x',
				body: 'y',
				audience: { kind: 'sections', sectionIds: ['s-9b'] },
			}),
		).rejects.toBeInstanceOf(ForbiddenException);
		await service.create('u', 't', {
			title: 'x',
			body: 'y',
			audience: { kind: 'sections', sectionIds: ['s-7a'] },
		});
		expect(repository.create).toHaveBeenCalledWith(
			expect.objectContaining({ createdByMembershipId: 'teacher-m' }),
		);
	});

	it('shows a teacher only their own notices', async () => {
		signedInAs(teacher);
		await service.list('u', 't', { tab: 'drafts' });
		expect(repository.list).toHaveBeenCalledWith('t', {
			statuses: ['draft', 'pending_approval'],
			createdBy: 'teacher-m',
			limit: 100,
		});
		repository.findById.mockResolvedValue(noticeRow({ createdByMembershipId: 'someone-else' }));
		await expect(service.get('u', 't', 'notice-1')).rejects.toBeInstanceOf(NotFoundException);
	});

	it('only leadership sends directly', async () => {
		signedInAs(teacher);
		await expect(service.sendNow('u', 't', 'notice-1')).rejects.toMatchObject({
			response: { code: 'NOTICE_NEEDS_APPROVAL' },
		});
		signedInAs(principal);
		await service.sendNow('u', 't', 'notice-1');
		expect(repository.send).toHaveBeenCalledWith(
			expect.objectContaining({ from: ['draft'], sentByMembershipId: 'principal-m' }),
		);
	});

	it('refuses to send to an empty audience', async () => {
		signedInAs(principal);
		repository.resolveRecipients.mockResolvedValue({ guardians: [], staff: [] });
		await expect(service.sendNow('u', 't', 'notice-1')).rejects.toBeInstanceOf(BadRequestException);
	});

	it('edits only drafts', async () => {
		signedInAs(principal);
		repository.update.mockResolvedValue(null);
		await expect(service.update('u', 't', 'notice-1', { title: 'New' })).rejects.toBeInstanceOf(
			ConflictException,
		);
	});

	it('locks a draft for approval and snapshots its reach', async () => {
		signedInAs(teacher);
		const snapshot = await service.submitForApproval('u', 't', 'notice-1');
		expect(repository.update).toHaveBeenCalledWith('t', 'notice-1', ['draft', 'pending_approval'], {
			status: 'pending_approval',
		});
		expect(snapshot.audienceLabel).toBe('Parents of 7-A');
		expect(snapshot.reach.total).toBe(3);
	});

	it('sends an approved notice only while it waits', async () => {
		repository.send.mockResolvedValue(null);
		await expect(service.sendApproved('t', 'notice-1', 'p', new Date())).rejects.toMatchObject({
			response: { code: 'NOTICE_NOT_PENDING' },
		});
	});

	it('refuses notices to parents and students', async () => {
		signedInAs({ id: 'parent-m', role: 'parent' });
		await expect(service.list('u', 't', { tab: 'sent' })).rejects.toBeInstanceOf(
			ForbiddenException,
		);
	});
});
