import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AccessScopeService } from '@/modules/access-scope/access-scope.service';
import type { MembershipsService } from '@/modules/memberships/memberships.service';
import type { MessagesRepository } from './messages.repository';
import { MessagesService } from './messages.service';

const principal = { id: 'principal-m', role: 'principal' as const };
const teacher = { id: 'teacher-m', role: 'teacher' as const };
const parent = { id: 'parent-m', role: 'parent' as const };

const threadRow = {
	thread: {
		id: 'thread-1',
		needsReply: true,
		lastMessageAt: new Date('2026-10-29T09:02:00Z'),
		lastMessagePreview: 'He has fever since last night',
		lastMessageDirection: 'from_family' as const,
	},
	guardian: {
		id: 'guardian-1',
		firstName: 'Javed',
		lastName: 'Akhtar',
		membershipId: 'parent-m',
		phone: null,
	},
	student: { id: 'student-1', firstName: 'Saad', lastName: 'Javed' },
	sectionName: '7-B',
	relationship: 'father',
	unread: 2,
};

describe('MessagesService', () => {
	let repository: Record<string, ReturnType<typeof vi.fn>>;
	let memberships: Record<string, ReturnType<typeof vi.fn>>;
	let accessScope: Record<string, ReturnType<typeof vi.fn>>;
	let service: MessagesService;

	function signedInAs(membership: { id: string; role: string }, roles = [membership.role]) {
		memberships.requireActiveMembership.mockResolvedValue(membership);
		memberships.listRoleCodes.mockResolvedValue(roles);
	}

	beforeEach(() => {
		repository = {
			listThreads: vi.fn(async () => [threadRow]),
			findThread: vi.fn(async () => threadRow),
			listMessages: vi.fn(async () => [
				{
					message: {
						id: 'm1',
						direction: 'from_family',
						body: 'He has fever',
						channel: 'app',
						status: 'sent',
						readAt: null,
						createdAt: new Date('2026-10-29T09:02:00Z'),
						senderMembershipId: 'parent-m',
					},
					senderName: 'Javed Akhtar',
				},
			]),
			markRead: vi.fn(async () => undefined),
			send: vi.fn(async () => ({ threadId: 'thread-1', message: { id: 'm2' } })),
			isLinked: vi.fn(async () => true),
			listGuardianIdsForMembership: vi.fn(async () => ['guardian-1']),
			listRecipients: vi.fn(async () => []),
			countNeedsReply: vi.fn(async () => 1),
		};
		memberships = { requireActiveMembership: vi.fn(), listRoleCodes: vi.fn() };
		accessScope = {
			listAccessibleStudentIds: vi.fn(async () => 'all'),
			requireStudentAccess: vi.fn(async () => undefined),
		};
		service = new MessagesService(
			repository as unknown as MessagesRepository,
			memberships as unknown as MembershipsService,
			accessScope as unknown as AccessScopeService,
		);
	});

	it('lists every thread for leadership, counting unread family messages', async () => {
		signedInAs(principal);
		const result = await service.listThreads('u', 't', { filter: 'needs_reply' });
		expect(result.viewer).toBe('school');
		expect(repository.listThreads).toHaveBeenCalledWith(
			't',
			{ studentIds: 'all', unreadDirection: 'from_family' },
			expect.objectContaining({ needsReply: true }),
		);
		expect(result.threads[0]).toMatchObject({
			guardian: { name: 'Javed Akhtar', relationship: 'father', hasAppAccount: true },
			student: { name: 'Saad Javed', sectionName: '7-B' },
			unread: 2,
		});
	});

	it('scopes teachers to their students and parents to their own threads', async () => {
		signedInAs(teacher);
		accessScope.listAccessibleStudentIds.mockResolvedValue(['student-9']);
		await service.listThreads('u', 't', { filter: 'all' });
		expect(repository.listThreads).toHaveBeenLastCalledWith(
			't',
			{ studentIds: ['student-9'], unreadDirection: 'from_family' },
			expect.anything(),
		);
		signedInAs(parent);
		await service.listThreads('u', 't', { filter: 'all' });
		expect(repository.listThreads).toHaveBeenLastCalledWith(
			't',
			{ studentIds: 'all', guardianIds: ['guardian-1'], unreadDirection: 'to_family' },
			expect.anything(),
		);
	});

	it('hides a thread about a student the teacher cannot see', async () => {
		signedInAs(teacher);
		accessScope.listAccessibleStudentIds.mockResolvedValue(['student-9']);
		await expect(service.getThread('u', 't', 'thread-1')).rejects.toBeInstanceOf(NotFoundException);
		expect(repository.markRead).not.toHaveBeenCalled();
	});

	it('hides another family’s thread, or one for a child no longer linked', async () => {
		signedInAs(parent);
		repository.listGuardianIdsForMembership.mockResolvedValue(['guardian-2']);
		await expect(service.getThread('u', 't', 'thread-1')).rejects.toBeInstanceOf(NotFoundException);
		repository.listGuardianIdsForMembership.mockResolvedValue(['guardian-1']);
		repository.isLinked.mockResolvedValue(false);
		await expect(service.getThread('u', 't', 'thread-1')).rejects.toBeInstanceOf(NotFoundException);
	});

	it('marks the other side read when a thread is opened', async () => {
		signedInAs(principal);
		const result = await service.getThread('u', 't', 'thread-1');
		expect(repository.markRead).toHaveBeenCalledWith(
			't',
			'thread-1',
			'from_family',
			expect.any(Date),
		);
		expect(result.thread.unread).toBe(0);
		expect(result.messages[0]).toMatchObject({ senderName: 'Javed Akhtar', mine: false });
	});

	it('staff must pick a linked guardian of a child they can see', async () => {
		signedInAs(principal);
		await expect(
			service.startThread('u', 't', { studentId: 'student-1', body: 'Hello' }),
		).rejects.toBeInstanceOf(BadRequestException);
		repository.isLinked.mockResolvedValue(false);
		await expect(
			service.startThread('u', 't', { studentId: 'student-1', guardianId: 'g-x', body: 'Hello' }),
		).rejects.toMatchObject({ response: { code: 'GUARDIAN_NOT_FOUND' } });
		repository.isLinked.mockResolvedValue(true);
		await service.startThread('u', 't', {
			studentId: 'student-1',
			guardianId: 'guardian-1',
			body: 'Hello',
		});
		expect(accessScope.requireStudentAccess).toHaveBeenCalledWith('t', principal, 'student-1');
		expect(repository.send).toHaveBeenCalledWith(
			expect.objectContaining({
				direction: 'to_family',
				guardianId: 'guardian-1',
				senderMembershipId: 'principal-m',
			}),
		);
	});

	it('a parent writes to the school as the guardian linked to that child', async () => {
		signedInAs(parent);
		await service.startThread('u', 't', {
			studentId: 'student-1',
			body: 'Is the trip form due Friday?',
		});
		expect(repository.send).toHaveBeenCalledWith(
			expect.objectContaining({ direction: 'from_family', guardianId: 'guardian-1' }),
		);
		repository.isLinked.mockResolvedValue(false);
		await expect(
			service.startThread('u', 't', { studentId: 'student-2', body: 'Hi' }),
		).rejects.toMatchObject({ response: { code: 'STUDENT_NOT_FOUND' } });
	});

	it('replies on the thread’s own guardian and child', async () => {
		signedInAs(teacher);
		accessScope.listAccessibleStudentIds.mockResolvedValue(['student-1']);
		await service.reply('u', 't', 'thread-1', 'Get well soon');
		expect(repository.send).toHaveBeenCalledWith(
			expect.objectContaining({
				guardianId: 'guardian-1',
				studentId: 'student-1',
				direction: 'to_family',
			}),
		);
	});

	it('treats a member who is both teacher and parent as school', async () => {
		signedInAs(teacher, ['teacher', 'parent']);
		const result = await service.listThreads('u', 't', { filter: 'all' });
		expect(result.viewer).toBe('school');
	});

	it('refuses roles without messages', async () => {
		signedInAs({ id: 's', role: 'student' });
		await expect(service.listThreads('u', 't', { filter: 'all' })).rejects.toBeInstanceOf(
			NotFoundException,
		);
	});
});
