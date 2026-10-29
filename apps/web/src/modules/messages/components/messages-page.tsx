"use client";

import { Add01Icon, BubbleChatIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchInput } from "@school-os/ui/components/search-input";
import { Spinner } from "@school-os/ui/components/spinner";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ErrorState } from "@/components/states";
import { ListPage } from "@/components/list-page";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useTenantContext } from "@/modules/tenants";
import { useThreadsQuery } from "../hooks/use-messages";
import { useDebouncedValue } from "../lib/use-debounced-value";
import { NewMessageDialog } from "./new-message-dialog";
import { ThreadList } from "./thread-list";
import { ThreadView } from "./thread-view";

/**
 * Messages (Figma `77:66449`): conversations with families on the left, the open one on the
 * right. Staff see the children they can see; a parent sees their own conversations.
 */
export function MessagesPage() {
	const now = useNow();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { activeTenant } = useTenantContext();
	const tenantId = activeTenant?.id ?? null;
	const selectedId = searchParams.get("thread");
	const [filter, setFilter] = useState<"all" | "needs_reply">("all");
	const [search, setSearch] = useState("");
	const debounced = useDebouncedValue(search.trim(), 250);
	const [composing, setComposing] = useState(false);
	const query = useThreadsQuery(tenantId, filter, debounced);

	const viewer = query.data?.viewer ?? "school";
	const threads = query.data?.threads ?? [];
	const needReply = threads.filter((thread) => thread.needsReply).length;

	function select(threadId: string) {
		const params = new URLSearchParams(searchParams.toString());
		params.set("thread", threadId);
		router.replace(`${pathname}?${params}`, { scroll: false });
	}

	return (
		<ListPage title="Messages" tabs={[{ label: "Inbox", href: "/admin/messages", active: true }]}>
			<div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[minmax(300px,372px)_1fr]">
				<section
					className={cn(
						"flex min-h-0 flex-col border-dashboard-border md:border-e",
						selectedId && "hidden md:flex",
					)}
				>
					<div className="flex shrink-0 items-center gap-2 px-4 pt-3">
						<h2 className="font-medium text-[14px] text-dashboard-text-primary">
							{viewer === "school" ? "Guardians" : "Your conversations"}
						</h2>
						{viewer === "school" && needReply > 0 ? (
							<button
								type="button"
								onClick={() => setFilter(filter === "needs_reply" ? "all" : "needs_reply")}
								aria-pressed={filter === "needs_reply"}
								className="inline-flex h-6 items-center gap-1.5 rounded-[4px] bg-[color-mix(in_oklab,var(--rx-danger)_16%,transparent)] px-2 text-[12px] text-[var(--rx-danger)]"
							>
								<span className="size-1.5 rounded-full bg-[var(--rx-danger)]" />
								{needReply} need reply
							</button>
						) : filter === "needs_reply" ? (
							<button
								type="button"
								onClick={() => setFilter("all")}
								className="text-[12px] text-dashboard-text-dim hover:text-dashboard-text-primary"
							>
								Show all
							</button>
						) : null}
						<button
							type="button"
							onClick={() => setComposing(true)}
							className="ms-auto inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-dashboard-border-strong px-3 font-medium text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
						>
							<HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={2} />
							New
						</button>
					</div>
					{viewer === "school" ? (
						<div className="shrink-0 px-4 pt-3">
							<SearchInput
								value={search}
								onValueChange={setSearch}
								placeholder="Search guardians, children or messages"
								aria-label="Search conversations"
							/>
						</div>
					) : null}
					<div className="min-h-0 flex-1 overflow-y-auto">
						{query.error ? (
							<ErrorState onRetry={() => void query.refetch()} />
						) : query.isLoading ? (
							<div className="flex justify-center py-10">
								<Spinner className="size-5" />
							</div>
						) : threads.length === 0 ? (
							<div className="px-6 py-12 text-center">
								<p className="font-medium text-[14px] text-dashboard-text-primary">
									{filter === "needs_reply" ? "Nothing needs a reply" : "No conversations yet"}
								</p>
								<p className="mt-1 text-[13px] text-dashboard-text-dim">
									{viewer === "school"
										? "When a family writes, it shows here. Start one with New."
										: "Write to the school about your child with New."}
								</p>
							</div>
						) : (
							<ThreadList
								threads={threads}
								viewer={viewer}
								selectedId={selectedId}
								now={now}
								onSelect={select}
							/>
						)}
					</div>
				</section>

				<section className={cn("min-h-0", !selectedId && "hidden md:block")}>
					{selectedId && tenantId ? (
						<ThreadView
							tenantId={tenantId}
							threadId={selectedId}
							schoolName={activeTenant?.name ?? "The school"}
							now={now}
						/>
					) : (
						<div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
							<HugeiconsIcon
								icon={BubbleChatIcon}
								size={22}
								strokeWidth={1.8}
								className="text-dashboard-text-dim"
							/>
							<p className="text-[14px] text-dashboard-text-primary">Pick a conversation</p>
							<p className="max-w-sm text-[13px] text-dashboard-text-dim">
								Messages here are seen in the School OS app. WhatsApp delivery arrives once it is
								connected.
							</p>
						</div>
					)}
				</section>
			</div>

			{tenantId ? (
				<NewMessageDialog
					open={composing}
					tenantId={tenantId}
					viewer={viewer}
					onClose={() => setComposing(false)}
					onStarted={(threadId) => {
						setComposing(false);
						select(threadId);
					}}
				/>
			) : null}
		</ListPage>
	);
}
