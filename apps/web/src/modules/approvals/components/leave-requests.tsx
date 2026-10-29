"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@school-os/ui/components/dialog";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Textarea } from "@school-os/ui/components/textarea";
import { useToast } from "@school-os/ui/components/toaster";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { useCancelApproval, useMyApprovalsQuery, useRequestLeave } from "../hooks/use-approvals";
import type { ApprovalView, LeaveReason } from "../types/approvals.types";
import { requestOutcomeLine, RequestStatus } from "./request-status";

type Child = { studentId: string; name: string };

const REASONS: { value: LeaveReason; label: string }[] = [
	{ value: "sick", label: "Sick" },
	{ value: "family", label: "Family" },
	{ value: "travel", label: "Travel" },
	{ value: "other", label: "Other" },
];

const RECENT = 6;

/** A guardian's leave requests for their children, with "Ask for leave" (Approvals, leave). */
export function LeaveRequests({
	tenantId,
	childOptions,
}: {
	tenantId: string;
	childOptions: Child[];
}) {
	const toast = useToast();
	const mine = useMyApprovalsQuery(tenantId);
	const cancel = useCancelApproval(tenantId);
	const [asking, setAsking] = useState(false);
	const requests = (mine.data ?? []).filter((request) => request.type === "leave").slice(0, RECENT);

	return (
		<section className="mb-8 rounded-[14px] border border-dashboard-border bg-dashboard-surface p-4 tracking-[-0.15px] sm:p-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-medium text-[15px] text-dashboard-text-primary">Leave</h2>
					<p className="text-[13px] text-dashboard-text-dim">
						Tell the school your child will be away. Once the principal approves, the days are
						marked excused.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setAsking(true)}
					className="inline-flex h-8 items-center rounded-[6px] bg-[var(--rx-accent)] px-3 font-medium text-[13px] text-white hover:opacity-90"
				>
					Ask for leave
				</button>
			</div>

			{requests.length > 0 ? (
				<ul className="mt-4 divide-y divide-dashboard-border border-dashboard-border border-t">
					{requests.map((request) => (
						<LeaveRow
							key={request.id}
							request={request}
							cancelling={cancel.isPending}
							onCancel={() =>
								cancel.mutate(request.id, {
									onSuccess: () =>
										toast.show({ title: "Leave request withdrawn", status: "success" }),
									onError: (error) =>
										toast.show({
											title: "Could not withdraw",
											description: error instanceof Error ? error.message : undefined,
											status: "error",
										}),
								})
							}
						/>
					))}
				</ul>
			) : null}

			<LeaveDialog
				open={asking}
				tenantId={tenantId}
				childOptions={childOptions}
				onClose={() => setAsking(false)}
			/>
		</section>
	);
}

function LeaveRow({
	request,
	cancelling,
	onCancel,
}: {
	request: ApprovalView;
	cancelling: boolean;
	onCancel: () => void;
}) {
	const outcome = requestOutcomeLine(request);
	return (
		<li className="flex flex-wrap items-start gap-3 py-3 text-[13px]">
			<div className="min-w-0 flex-1">
				<p className="font-medium text-dashboard-text-primary">{request.card.title}</p>
				<p className="text-dashboard-text-dim">{request.card.subtitle}</p>
				{outcome ? <p className="mt-1 text-dashboard-text-secondary">{outcome}</p> : null}
			</div>
			<RequestStatus status={request.status} />
			{request.status === "pending" ? (
				<button
					type="button"
					disabled={cancelling}
					onClick={onCancel}
					className="inline-flex h-6 items-center rounded-[4px] px-1.5 text-[12px] text-dashboard-text-dim hover:bg-dashboard-hover hover:text-dashboard-text-primary disabled:opacity-50"
				>
					Withdraw
				</button>
			) : null}
		</li>
	);
}

function LeaveDialog({
	open,
	tenantId,
	childOptions,
	onClose,
}: {
	open: boolean;
	tenantId: string;
	childOptions: Child[];
	onClose: () => void;
}) {
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="gap-0 overflow-hidden border border-dashboard-border-strong bg-dashboard-surface p-0 tracking-[-0.15px] sm:max-w-[480px]">
				{open ? (
					<LeaveForm tenantId={tenantId} childOptions={childOptions} onClose={onClose} />
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function LeaveForm({
	tenantId,
	childOptions,
	onClose,
}: {
	tenantId: string;
	childOptions: Child[];
	onClose: () => void;
}) {
	const toast = useToast();
	const request = useRequestLeave(tenantId);
	const [today] = useState(() => new Date().toLocaleDateString("en-CA"));
	const [studentId, setStudentId] = useState(childOptions[0]?.studentId ?? "");
	const [fromDate, setFromDate] = useState(today);
	const [toDate, setToDate] = useState(today);
	const [reason, setReason] = useState<LeaveReason>("sick");
	const [message, setMessage] = useState("");
	const child = childOptions.find((item) => item.studentId === studentId);
	const id = useId();
	const valid = Boolean(studentId && fromDate && toDate && fromDate <= toDate);

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (!valid) return;
				request.mutate(
					{ input: { studentId, fromDate, toDate, reason }, note: message.trim() },
					{
						onSuccess: () => {
							toast.show({
								title: "Sent to the school",
								description: "You will see here when the principal decides.",
								status: "success",
							});
							onClose();
						},
						onError: (error) =>
							toast.show({
								title: "Leave request not sent",
								description: error instanceof Error ? error.message : undefined,
								status: "error",
							}),
					},
				);
			}}
		>
			<div className="space-y-5 px-5 pt-5 pb-4">
				<div>
					<DialogTitle className="pe-8 font-medium text-[20px] text-dashboard-text-primary leading-7">
						Ask for leave{child ? ` for ${child.name}` : ""}
					</DialogTitle>
					<DialogDescription className="mt-1 text-[13px] text-dashboard-text-secondary">
						School days only. You can ask up to a week back.
					</DialogDescription>
				</div>

				{childOptions.length > 1 ? (
					<div>
						<p className="mb-2 text-[12px] text-dashboard-text-dim">Child</p>
						<SelectField
							aria-label="Child"
							items={childOptions.map((item) => ({ value: item.studentId, label: item.name }))}
							value={studentId}
							onValueChange={setStudentId}
						/>
					</div>
				) : null}

				<div className="grid grid-cols-2 gap-3">
					<div>
						<label htmlFor={`${id}-from`} className="block text-[12px] text-dashboard-text-dim">
							From
						</label>
						<Input
							id={`${id}-from`}
							type="date"
							value={fromDate}
							onChange={(event) => {
								setFromDate(event.target.value);
								if (event.target.value > toDate) setToDate(event.target.value);
							}}
							className="mt-2 h-9"
						/>
					</div>
					<div>
						<label htmlFor={`${id}-to`} className="block text-[12px] text-dashboard-text-dim">
							To
						</label>
						<Input
							id={`${id}-to`}
							type="date"
							value={toDate}
							min={fromDate}
							onChange={(event) => setToDate(event.target.value)}
							className="mt-2 h-9"
						/>
					</div>
				</div>

				<fieldset>
					<legend className="mb-2 text-[12px] text-dashboard-text-dim">Why</legend>
					<div className="flex flex-wrap gap-2">
						{REASONS.map((option) => (
							<button
								key={option.value}
								type="button"
								aria-pressed={reason === option.value}
								onClick={() => setReason(option.value)}
								className={cn(
									"inline-flex h-8 items-center rounded-[8px] border px-3 text-[13px] transition-colors",
									reason === option.value
										? "border-[var(--rx-accent)] bg-[color-mix(in_oklab,var(--rx-accent)_14%,transparent)] text-dashboard-text-primary"
										: "border-dashboard-border-strong text-dashboard-text-secondary hover:bg-dashboard-hover",
								)}
							>
								{option.label}
							</button>
						))}
					</div>
				</fieldset>

				<div>
					<label htmlFor={`${id}-message`} className="block text-[12px] text-dashboard-text-dim">
						Message to the school
					</label>
					<Textarea
						id={`${id}-message`}
						value={message}
						onChange={(event) => setMessage(event.target.value)}
						rows={3}
						maxLength={500}
						placeholder="We have a family wedding in Lahore, so she will be away Monday to Wednesday."
						className="mt-2 min-h-[80px] text-[14px]"
					/>
				</div>
			</div>
			<footer className="flex items-center justify-end gap-2 border-dashboard-border border-t px-5 py-3">
				<button
					type="button"
					onClick={onClose}
					className="inline-flex h-8 items-center rounded-[6px] border border-dashboard-border-strong px-3 font-medium text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={!valid || request.isPending}
					className="inline-flex h-8 items-center rounded-[6px] bg-[var(--rx-accent)] px-3 font-medium text-[13px] text-white hover:opacity-90 disabled:opacity-50"
				>
					Send to the school
				</button>
			</footer>
		</form>
	);
}
