"use client";

import { Button } from "@school-os/ui/components/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerTitle,
} from "@school-os/ui/components/drawer";
import Link from "next/link";
import type { ReactNode } from "react";
import { InitialsAvatar } from "@/components/initials-avatar";
import { useConfirmedAction } from "@/components/states";
import { cn } from "@/lib/utils";
import { useUpdateAssessmentMutation } from "../hooks/use-assessments-queries";
import { resultSummary, scheduleLabel } from "../lib/assessment-format";
import type { AssessmentListItem } from "../types/assessments.types";

const STATUS_PILL: Record<AssessmentListItem["status"], { label: string; className: string }> = {
	draft: {
		label: "Draft",
		className: "bg-dashboard-hover text-dashboard-text-secondary",
	},
	published: {
		label: "Published",
		className:
			"bg-[color-mix(in_oklab,var(--rx-success)_16%,transparent)] text-[var(--rx-success)]",
	},
	closed: {
		label: "Closed",
		className: "bg-dashboard-hover text-dashboard-text-dim",
	},
};

/** Figma tests side panel (`181:49526`): status, actions, details, results and who sits it. */
export function AssessmentPanel({
	tenantId,
	row,
	todayIso,
	canWrite,
	onClose,
}: {
	tenantId: string | null;
	row: AssessmentListItem | null;
	todayIso: string;
	canWrite: boolean;
	onClose: () => void;
}) {
	const update = useUpdateAssessmentMutation(tenantId ?? "");
	const confirmed = useConfirmedAction();

	function changeStatus(test: AssessmentListItem, status: "published" | "closed") {
		const publishing = status === "published";
		void confirmed({
			title: publishing ? `Publish ${test.title}?` : `Close ${test.title}?`,
			subtitle: `${test.sectionName} · ${test.subjectName}`,
			consequences: publishing
				? [
						{ label: "Who sees it", value: `${test.recipientCount} students` },
						{ label: "Families", value: "Not notified until WhatsApp is connected" },
					]
				: [{ label: "Marks", value: "Stay in marks and report cards" }],
			confirmLabel: publishing ? "Publish" : "Close test",
			action: () => update.mutateAsync({ assessmentId: test.id, input: { status } }),
			success: publishing ? `${test.title} is published` : `${test.title} is closed`,
			failure: "Could not update the test",
		});
	}

	return (
		<Drawer open={Boolean(row)} onOpenChange={(open) => !open && onClose()} direction="right">
			<DrawerContent className="h-full max-h-none gap-0 border-dashboard-border bg-dashboard-sidebar-bg text-[13px] tracking-[-0.15px] data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-[440px]">
				{row ? (
					<div className="flex h-full min-h-0 flex-col">
						<header className="flex items-start gap-3 border-dashboard-border border-b px-5 py-4">
							<InitialsAvatar name={row.subjectName} tone="accent" />
							<div className="min-w-0 flex-1">
								<DrawerTitle className="font-medium text-[15px] text-dashboard-text-primary">
									{row.title}
								</DrawerTitle>
								<DrawerDescription className="truncate text-[12px] text-dashboard-text-dim">
									{row.sectionName} · {row.subjectName} · {scheduleLabel(row)}
								</DrawerDescription>
							</div>
							<button
								type="button"
								onClick={onClose}
								className="rounded-[6px] px-2 py-1 text-[12px] text-dashboard-text-dim hover:bg-dashboard-hover"
							>
								Close
							</button>
						</header>

						<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
							<div className="flex flex-wrap items-center gap-2">
								<span
									className={cn(
										"inline-flex h-6 items-center rounded-[4px] px-2 text-[12px]",
										STATUS_PILL[row.status].className,
									)}
								>
									{STATUS_PILL[row.status].label}
								</span>
								<span className="inline-flex h-6 items-center rounded-[4px] bg-dashboard-hover px-2 text-[12px] text-dashboard-text-secondary capitalize">
									{row.type}
								</span>
								<span className="inline-flex h-6 items-center rounded-[4px] bg-dashboard-hover px-2 text-[12px] text-dashboard-text-secondary">
									{row.recipientCount} students
								</span>
							</div>

							<div className="flex flex-wrap gap-2">
								{canWrite && row.status === "draft" ? (
									<Button
										size="sm"
										disabled={update.isPending}
										onClick={() => changeStatus(row, "published")}
									>
										Publish
									</Button>
								) : null}
								<Button
									size="sm"
									variant={row.status === "draft" ? "outline" : "default"}
									nativeButton={false}
									render={<Link href={`/admin/assessments/${row.id}`} />}
								>
									{row.status === "draft" ? "Open" : "Enter marks"}
								</Button>
								{canWrite && row.status === "published" ? (
									<Button
										size="sm"
										variant="outline"
										disabled={update.isPending}
										onClick={() => changeStatus(row, "closed")}
									>
										Close test
									</Button>
								) : null}
							</div>

							<Section title="Details">
								<Detail label="Marks out of" value={String(row.maxScore)} />
								<Detail
									label="Duration"
									value={row.durationMinutes ? `${row.durationMinutes} min` : "Not set"}
								/>
								<Detail label="Room" value={row.room ?? "Not set"} />
								{row.instructions ? (
									<p className="whitespace-pre-line rounded-[8px] bg-dashboard-hover/60 px-3 py-2 text-dashboard-text-secondary">
										{row.instructions}
									</p>
								) : null}
							</Section>

							<Section title="Results">
								<Detail label="So far" value={resultSummary(row, todayIso).label} />
								<Detail
									label="Marked"
									value={`${row.results.graded} of ${row.recipientCount}${
										row.results.absent ? ` · ${row.results.absent} absent` : ""
									}`}
								/>
							</Section>

							<Section title="Who gets it">
								<div className="flex items-center gap-3 rounded-[8px] bg-dashboard-hover/60 px-3 py-2.5">
									<InitialsAvatar name={row.sectionName} />
									<div className="min-w-0">
										<p className="font-medium text-dashboard-text-primary">
											{row.sectionName} ·{" "}
											{row.assignMode === "selected_students"
												? `${row.recipientCount} chosen students`
												: `${row.recipientCount} students`}
										</p>
										<p className="text-[12px] text-dashboard-text-dim">
											{row.startsAt
												? `Starts ${scheduleLabel(row)}${
														row.durationMinutes ? ` for ${row.durationMinutes} minutes` : ""
													}`
												: "No start time set"}
										</p>
									</div>
								</div>
								<p className="text-[12px] text-dashboard-text-dim leading-4">
									Families are not notified yet: WhatsApp notices arrive with messaging. Questions
									and AI drafting come with the AI layer.
								</p>
							</Section>
						</div>
					</div>
				) : (
					<>
						<DrawerTitle className="sr-only">Test</DrawerTitle>
						<DrawerDescription className="sr-only">No test selected</DrawerDescription>
					</>
				)}
			</DrawerContent>
		</Drawer>
	);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<section className="space-y-2">
			<h3 className="text-[12px] text-dashboard-text-dim uppercase">{title}</h3>
			{children}
		</section>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4">
			<span className="text-dashboard-text-dim">{label}</span>
			<span className="text-end text-dashboard-text-primary">{value}</span>
		</div>
	);
}
