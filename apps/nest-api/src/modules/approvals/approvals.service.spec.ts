import { ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import type { MembershipsService } from '@/modules/memberships/memberships.service';
import type { ApprovalHandler } from './approval-handler';
import type { ApprovalsRegistry } from './approvals.registry';
import type { ApprovalRow, ApprovalsRepository } from './approvals.repository';
import { ApprovalsService, UNDO_WINDOW_MS } from './approvals.service';

const principal = { id: 'principal-m', role: 'principal' as const };
const teacher = { id: 'teacher-m', role: 'teacher' as const };

function row(overrides: Partial<ApprovalRow> = {}): ApprovalRow {
	return {
		id: 'approval-1',
		tenantId: 'tenant-1',
		type: 'attendance_change',
		status: 'pending',
		risk: 'low',
		approverRole: 'leadership',
		payload: { studentName: 'Ali Raza' },
		dedupeKey: 'attendance:s:st',
		note: null,
		requestedByMembershipId: teacher.id,
		decidedByMembershipId: null,
		decidedAt: null,
		decisionReason: null,
		result: null,
		undoUntil: null,
		expiresAt: null,
		createdAt: new Date('2026-10-28T08:00:00Z'),
		updatedAt: new Date('2026-10-28T08:00:00Z'),
		requesterName: 'Hina Akhtar',
		deciderName: null,
		...overrides,
	};
}

describe('ApprovalsService', () => {
	let service: ApprovalsService;
	let repository: Record<string, ReturnType<typeof vi.fn>>;
	let handler: Record<string, ReturnType<typeof vi.fn>> &
		Pick<ApprovalHandler, 'type' | 'label' | 'inputSchema'>;
	let memberships: Record<string, ReturnType<typeof vi.fn>>;
	let current: ApprovalRow;

	beforeEach(() => {
		current = row();
		repository = {
			findById: vi.fn(async () => current),
			listPending: vi.fn(async () => [current]),
			listByRequester: vi.fn(async () => [current]),
			summarizeDecidedSince: vi.fn(async () => [
				{ status: 'approved', count: 3, longestWaitMs: 5 * 60 * 60 * 1000 },
			]),
			insert: vi.fn(async () => current),
			transition: vi.fn(async ({ set }) => {
				current = { ...current, ...set };
				return current;
			}),
			expireDue: vi.fn(async () => 0),
			countPending: vi.fn(async () => 1),
		};
		handler = {
			type: 'attendance_change',
			label: 'Attendance',
			inputSchema: z.object({ studentId: z.string() }),
			prepare: vi.fn(async () => ({
				payload: { studentName: 'Ali Raza' },
				dedupeKey: 'attendance:s:st',
				risk: 'low',
				approverRole: 'leadership',
				expiresAt: null,
			})),
			describe: vi.fn(() => ({
				title: 'Mark Ali Raza present',
				subtitle: '7-A',
				quote: null,
				facts: [],
				outcome: 'If you approve',
				approveLabel: 'Approve change',
				declineTitle: 'Say no?',
				declineReasons: [],
			})),
			apply: vi.fn(async () => ({
				headline: 'Ali Raza is marked present.',
				facts: [{ label: 'Attendance', value: 'Absent → Present' }],
				undo: { status: 'absent' },
			})),
			undo: vi.fn(async () => undefined),
			expired: vi.fn(() => ({ summary: 'Kept', facts: [] })),
			declined: vi.fn((_payload, reason: string) => `Stays. Reason: ${reason}`),
		} as unknown as typeof handler;
		memberships = {
			requireActiveMembership: vi.fn(async () => principal),
			isManagementMember: vi.fn(
				async (membership: { role: string }) => membership.role !== 'teacher',
			),
			listRoleCodes: vi.fn(async () => ['principal']),
		};
		service = new ApprovalsService(
			repository as unknown as ApprovalsRepository,
			{ get: () => handler, types: () => [handler.type] } as unknown as ApprovalsRegistry,
			memberships as unknown as MembershipsService,
		);
	});

	it('expires due requests before reading the queue and sums today', async () => {
		const queue = await service.getQueue('user', 'tenant-1');
		expect(repository.expireDue).toHaveBeenCalledBefore(repository.listPending);
		expect(queue.pending[0]?.card.title).toBe('Mark Ali Raza present');
		expect(queue.today).toEqual({
			approved: 3,
			declined: 0,
			expired: 0,
			longestWaitMinutes: 300,
		});
	});

	it('keeps the queue to leadership', async () => {
		memberships.requireActiveMembership.mockResolvedValue(teacher);
		await expect(service.getQueue('user', 'tenant-1')).rejects.toBeInstanceOf(ForbiddenException);
	});

	it('creates through the handler and records the requester', async () => {
		memberships.requireActiveMembership.mockResolvedValue(teacher);
		await service.create('user', 'tenant-1', {
			type: 'attendance_change',
			input: { studentId: 'st' },
			note: 'Was at the dentist',
		});
		expect(handler.prepare).toHaveBeenCalledWith(
			{ userId: 'user', tenantId: 'tenant-1' },
			{ studentId: 'st' },
		);
		expect(repository.insert).toHaveBeenCalledWith(
			expect.objectContaining({ requestedByMembershipId: teacher.id, note: 'Was at the dentist' }),
		);
	});

	it('turns a duplicate pending request into a conflict', async () => {
		repository.insert.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));
		await expect(
			service.create('user', 'tenant-1', { type: 'attendance_change', input: { studentId: 'st' } }),
		).rejects.toMatchObject({ response: { code: 'APPROVAL_ALREADY_PENDING' } });
	});

	it('approves, applies as the approver and opens the undo window', async () => {
		const view = await service.approve('user', 'tenant-1', 'approval-1');
		expect(handler.apply).toHaveBeenCalledWith(
			{ tenantId: 'tenant-1', approver: principal },
			current.payload,
		);
		expect(view.status).toBe('approved');
		expect(view.effect?.headline).toBe('Ali Raza is marked present.');
		const opened = Date.parse(view.undoUntil ?? '') - Date.parse(view.decision?.at ?? '');
		expect(opened).toBe(UNDO_WINDOW_MS);
		expect(repository.transition).toHaveBeenLastCalledWith(
			expect.objectContaining({ audit: expect.objectContaining({ action: 'approvals.approved' }) }),
		);
	});

	it('puts the request back in the queue when applying fails', async () => {
		handler.apply.mockRejectedValue(new Error('boom'));
		await expect(service.approve('user', 'tenant-1', 'approval-1')).rejects.toThrow('boom');
		expect(current.status).toBe('pending');
		expect(current.decidedByMembershipId).toBeNull();
	});

	it('refuses when someone else decided first', async () => {
		repository.transition.mockResolvedValueOnce(null);
		await expect(service.approve('user', 'tenant-1', 'approval-1')).rejects.toBeInstanceOf(
			ConflictException,
		);
		expect(handler.apply).not.toHaveBeenCalled();
	});

	it('needs the owner for owner-only requests', async () => {
		current = row({ approverRole: 'owner' });
		await expect(service.approve('user', 'tenant-1', 'approval-1')).rejects.toMatchObject({
			response: { code: 'APPROVAL_NEEDS_OWNER' },
		});
	});

	it('declines with the reason the requester sees', async () => {
		const view = await service.decline('user', 'tenant-1', 'approval-1', 'Mark was right');
		expect(view.status).toBe('declined');
		expect(view.declined).toBe('Stays. Reason: Mark was right');
	});

	it('undoes inside the window and reverses the effect', async () => {
		current = row({
			status: 'approved',
			result: { headline: 'h', facts: [], undo: { status: 'absent' } },
			undoUntil: new Date(Date.now() + 10_000),
			decidedAt: new Date(),
		});
		const payload = current.payload;
		const view = await service.undo('user', 'tenant-1', 'approval-1');
		expect(handler.undo).toHaveBeenCalledWith(
			{ tenantId: 'tenant-1', approver: principal },
			payload,
			{ status: 'absent' },
		);
		expect(view.status).toBe('pending');
	});

	it('refuses undo once the window has closed', async () => {
		current = row({
			status: 'approved',
			result: { headline: 'h', facts: [], undo: {} },
			undoUntil: new Date(Date.now() - 1),
		});
		await expect(service.undo('user', 'tenant-1', 'approval-1')).rejects.toMatchObject({
			response: { code: 'APPROVAL_UNDO_CLOSED' },
		});
		expect(handler.undo).not.toHaveBeenCalled();
	});

	it('lets only the requester withdraw', async () => {
		await expect(service.cancel('user', 'tenant-1', 'approval-1')).rejects.toMatchObject({
			response: { code: 'APPROVAL_NOT_FOUND' },
		});
		memberships.requireActiveMembership.mockResolvedValue(teacher);
		const view = await service.cancel('user', 'tenant-1', 'approval-1');
		expect(view.status).toBe('cancelled');
	});
});
