"use client";

import { Spinner } from "@school-os/ui/components/spinner";
import { useToast } from "@school-os/ui/components/toaster";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import {
	DataTable,
	type DataTableColumn,
	DataTableFooterBar,
	DataTableToolbar,
	useClientDataTable,
} from "@/components/data-table";
import { ListPage } from "@/components/list-page";
import { ErrorState, useConfirm } from "@/components/states";
import { cn } from "@/lib/utils";
import { usePermissions, useTenantContext } from "@/modules/tenants";
import { useNoticeMutations, useNoticesQuery } from "../hooks/use-notices";
import { readRate, STATUS_LABEL, whenLabel } from "../lib/notice-format";
import type { NoticeDetail, NoticeDraft, NoticeItem } from "../types/notices.types";
import { NoticeComposer } from "./notice-composer";
import { NoticePanel } from "./notice-panel";
import { NoticesInbox } from "./notices-inbox";

const STAFF_ROLES = new Set(["owner", "principal", "vice_principal", "admin", "teacher"]);

type Tab = "sent" | "drafts" | "inbox";

/**
 * Notices (Figma `185:56501`). Staff see what they sent and their drafts, plus notices that reached
 * them; a parent sees only the notices that reached them.
 */
export function NoticesPage() {
	const searchParams = useSearchParams();
	const { activeTenant } = useTenantContext();
	const { role, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const staff = role ? STAFF_ROLES.has(role) : false;
	const param = searchParams.get("tab");
	const tab: Tab = !staff ? "inbox" : param === "drafts" || param === "inbox" ? param : "sent";

	if (permissionsLoading || !tenantId) {
		return (
			<div className="flex min-h-[240px] items-center justify-center">
				<Spinner className="size-6" />
			</div>
		);
	}

	const tabs = staff
		? [
				{ label: "Notices", href: "/admin/notices", active: tab === "sent" },
				{ label: "Drafts", href: "/admin/notices?tab=drafts", active: tab === "drafts" },
				{ label: "For you", href: "/admin/notices?tab=inbox", active: tab === "inbox" },
			]
		: [{ label: "Notices", href: "/admin/notices", active: true }];

	if (tab === "inbox") {
		return (
			<ListPage title="Notices" tabs={tabs}>
				<NoticesInbox tenantId={tenantId} />
			</ListPage>
		);
	}
	return <ManageNotices key={tab} tenantId={tenantId} tab={tab} tabs={tabs} />;
}

function ManageNotices({
	tenantId,
	tab,
	tabs,
}: {
	tenantId: string;
	tab: "sent" | "drafts";
	tabs: { label: string; href: string; active: boolean }[];
}) {
	const toast = useToast();
	const confirm = useConfirm();
	const list = useNoticesQuery(tenantId, tab);
	const mutations = useNoticeMutations(tenantId);
	const [search, setSearch] = useState("");
	const [openId, setOpenId] = useState<string | null>(null);
	const [composing, setComposing] = useState<{ editing: NoticeDetail | null } | null>(null);
	const table = useClientDataTable({
		data: list.data?.notices ?? [],
		pageSize: 50,
		searchQuery: search,
		searchFn: (row, query) =>
			row.title.toLowerCase().includes(query) || row.audienceLabel.toLowerCase().includes(query),
	});
	const busy =
		mutations.create.isPending ||
		mutations.update.isPending ||
		mutations.send.isPending ||
		mutations.submit.isPending;

	function failed(title: string, error: unknown) {
		toast.show({
			title,
			description: error instanceof Error ? error.message : undefined,
			status: "error",
		});
	}

	async function sendNow(notice: Pick<NoticeDetail, "id" | "title">, people: number | null) {
		const yes = await confirm({
			title: `Send ${notice.title}?`,
			consequences: [
				{
					label: "Who gets it",
					value: people === null ? "Everyone in the audience" : `${people} people`,
				},
				{ label: "In School OS", value: "Now, with read receipts" },
				{ label: "WhatsApp", value: "Once it is connected" },
			],
			confirmLabel: "Send now",
			tone: "neutral",
		});
		if (!yes) return false;
		try {
			await mutations.send.mutateAsync(notice.id);
			toast.show({ title: `${notice.title} is sent`, status: "success" });
			return true;
		} catch (error) {
			failed("Not sent", error);
			return false;
		}
	}

	async function submitForApproval(notice: Pick<NoticeDetail, "id" | "title">) {
		try {
			await mutations.submit.mutateAsync({ input: { noticeId: notice.id } });
			mutations.refresh();
			toast.show({
				title: "Sent to the principal",
				description: `${notice.title} goes out once it is approved.`,
				status: "success",
			});
		} catch (error) {
			failed("Not sent for approval", error);
		}
	}

	async function handleSave(draft: NoticeDraft, then: "draft" | "send") {
		const editing = composing?.editing ?? null;
		try {
			const saved = editing
				? await mutations.update.mutateAsync({ noticeId: editing.id, draft })
				: await mutations.create.mutateAsync(draft);
			setComposing(null);
			if (then === "draft") {
				toast.show({ title: "Draft saved", status: "success" });
				return;
			}
			if (saved.canSendDirectly) await sendNow(saved, saved.reach?.total ?? null);
			else await submitForApproval(saved);
		} catch (error) {
			failed("Notice not saved", error);
		}
	}

	async function handleDelete(notice: NoticeDetail) {
		const yes = await confirm({ title: `Delete ${notice.title}?`, confirmLabel: "Delete draft" });
		if (!yes) return;
		try {
			await mutations.remove.mutateAsync(notice.id);
			setOpenId(null);
			toast.show({ title: "Draft deleted", status: "success" });
		} catch (error) {
			failed("Not deleted", error);
		}
	}

	const columns: DataTableColumn<NoticeItem>[] = [
		{
			id: "title",
			header: "Notice",
			renderCell: (row) => (
				<button
					type="button"
					onClick={() => setOpenId(row.id)}
					className="text-start font-medium hover:underline"
				>
					{row.title}
				</button>
			),
		},
		{
			id: "audience",
			header: "Audience",
			renderCell: (row) => (
				<span className="inline-flex h-6 max-w-[260px] items-center truncate rounded-full border border-dashboard-border-strong px-2.5 text-[12px] text-dashboard-text-secondary">
					{row.audienceLabel}
				</span>
			),
		},
		tab === "sent"
			? {
					id: "sent",
					header: "Sent",
					renderCell: (row) => (
						<span className="whitespace-nowrap">{whenLabel(row).replace("Sent ", "")}</span>
					),
				}
			: {
					id: "status",
					header: "Status",
					renderCell: (row) => (
						<span
							className={cn(
								"whitespace-nowrap",
								row.status === "pending_approval"
									? "text-[var(--rx-warning)]"
									: "text-dashboard-text-secondary",
							)}
						>
							{STATUS_LABEL[row.status]}
						</span>
					),
				},
		...(tab === "sent"
			? [
					{
						id: "to",
						header: "Sent to",
						renderCell: (row: NoticeItem) => (
							<span className="tabular-nums">{row.recipientCount}</span>
						),
					},
					{
						id: "read",
						header: "Read",
						renderCell: (row: NoticeItem) => {
							const rate = readRate(row);
							return (
								<span className="whitespace-nowrap tabular-nums">
									{row.readCount} of {row.recipientCount}
									{rate === null ? (
										""
									) : (
										<span className="ms-1.5 text-dashboard-text-dim">{rate}%</span>
									)}
								</span>
							);
						},
					},
				]
			: [
					{
						id: "author",
						header: "Written by",
						renderCell: (row: NoticeItem) => <span>{row.author ?? "—"}</span>,
					},
				]),
	];

	const totals = list.data?.totals;

	return (
		<ListPage
			title="Notices"
			tabs={tabs}
			toolbar={
				<DataTableToolbar
					className="border-0 px-4 sm:px-6"
					search={search}
					onSearchChange={setSearch}
					searchPlaceholder="Search notices"
					canAdd
					addLabel="New notice"
					onAdd={() => setComposing({ editing: null })}
				/>
			}
			footer={
				<DataTableFooterBar
					shown={table.rows.length}
					total={table.totalRows}
					noun="notices"
					stats={[
						{ label: "Sent", value: totals?.sent ?? 0 },
						{ label: "Drafts", value: totals?.drafts ?? 0 },
						...(tab === "sent" ? [{ label: "Not read", value: totals?.notRead ?? 0 }] : []),
					]}
					pageIndex={table.pageIndex}
					pageCount={table.pageCount}
					pageSize={table.pageSize}
					onPageChange={table.setPageIndex}
					onPageSizeChange={table.setPageSize}
				/>
			}
		>
			{list.error ? (
				<ErrorState error={list.error} onRetry={() => void list.refetch()} />
			) : (
				<DataTable
					fullBleed
					columns={columns}
					rows={table.rows}
					getRowId={(row) => row.id}
					loading={list.isLoading}
					emptyState={
						<div className="px-6 py-14 text-center">
							<p className="font-medium text-[14px] text-dashboard-text-primary">
								{tab === "sent" ? "No notices sent yet" : "No drafts"}
							</p>
							<p className="mt-1 text-[13px] text-dashboard-text-dim">
								Write one with New notice. Families see it in School OS as soon as it is sent.
							</p>
						</div>
					}
				/>
			)}

			<NoticePanel
				tenantId={tenantId}
				noticeId={openId}
				busy={busy}
				onClose={() => setOpenId(null)}
				onSend={(notice) => void sendNow(notice, notice.reach?.total ?? null)}
				onSubmit={(notice) => void submitForApproval(notice)}
				onEdit={(notice) => setComposing({ editing: notice })}
				onDelete={(notice) => void handleDelete(notice)}
			/>
			<NoticeComposer
				open={composing !== null}
				tenantId={tenantId}
				editing={composing?.editing ?? null}
				busy={busy}
				onClose={() => setComposing(null)}
				onSave={(draft, then) => void handleSave(draft, then)}
			/>
		</ListPage>
	);
}
