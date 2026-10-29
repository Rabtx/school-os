"use client";

import { Checkbox } from "@school-os/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@school-os/ui/components/dialog";
import { Input } from "@school-os/ui/components/input";
import { SearchInput } from "@school-os/ui/components/search-input";
import { Textarea } from "@school-os/ui/components/textarea";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { useAudienceOptionsQuery, useAudiencePreviewQuery } from "../hooks/use-notices";
import { reachLine } from "../lib/notice-format";
import type { NoticeAudience, NoticeDetail, NoticeDraft } from "../types/notices.types";

const KINDS: { kind: NoticeAudience["kind"]; label: string; leadershipOnly: boolean }[] = [
	{ kind: "all_parents", label: "All parents", leadershipOnly: true },
	{ kind: "sections", label: "Some classes", leadershipOnly: false },
	{ kind: "staff", label: "Staff", leadershipOnly: true },
	{ kind: "everyone", label: "Everyone", leadershipOnly: true },
];

/**
 * Write or change a notice (Figma "New announcement" `295:158046`): title, message and who gets
 * it, with a live count. Leadership can send at once; a teacher sends it for approval.
 */
export function NoticeComposer({
	open,
	tenantId,
	editing,
	busy,
	onClose,
	onSave,
}: {
	open: boolean;
	tenantId: string;
	/** The draft being changed, or null for a new notice. */
	editing: NoticeDetail | null;
	busy: boolean;
	onClose: () => void;
	onSave: (draft: NoticeDraft, then: "draft" | "send") => void;
}) {
	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="gap-0 overflow-hidden border border-dashboard-border-strong bg-dashboard-surface p-0 tracking-[-0.15px] sm:max-w-[560px]">
				{open ? (
					<ComposerForm
						key={editing?.id ?? "new"}
						tenantId={tenantId}
						editing={editing}
						busy={busy}
						onClose={onClose}
						onSave={onSave}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function ComposerForm({
	tenantId,
	editing,
	busy,
	onClose,
	onSave,
}: {
	tenantId: string;
	editing: NoticeDetail | null;
	busy: boolean;
	onClose: () => void;
	onSave: (draft: NoticeDraft, then: "draft" | "send") => void;
}) {
	const id = useId();
	const options = useAudienceOptionsQuery(tenantId, true);
	const leadership = options.data?.canReachEveryone ?? false;
	const [title, setTitle] = useState(editing?.title ?? "");
	const [body, setBody] = useState(editing?.body ?? "");
	const [kind, setKind] = useState<NoticeAudience["kind"]>(editing?.audience.kind ?? "sections");
	const [sectionIds, setSectionIds] = useState<string[]>(
		editing?.audience.kind === "sections" ? editing.audience.sectionIds : [],
	);
	const [filter, setFilter] = useState("");
	const effectiveKind = leadership || options.isLoading ? kind : "sections";
	const audience: NoticeAudience =
		effectiveKind === "sections" ? { kind: "sections", sectionIds } : { kind: effectiveKind };
	const preview = useAudiencePreviewQuery(tenantId, audience, Boolean(options.data));
	const ready =
		title.trim().length > 0 &&
		body.trim().length > 0 &&
		(audience.kind !== "sections" || audience.sectionIds.length > 0);
	const sections = (options.data?.sections ?? []).filter((section) =>
		`${section.name} ${section.campusName}`.toLowerCase().includes(filter.trim().toLowerCase()),
	);
	const draft = (): NoticeDraft => ({ title: title.trim(), body: body.trim(), audience });

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (ready) onSave(draft(), "send");
			}}
		>
			<div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 pt-5 pb-4">
				<div>
					<DialogTitle className="pe-8 font-medium text-[20px] text-dashboard-text-primary leading-7">
						{editing ? "Change notice" : "New notice"}
					</DialogTitle>
					<DialogDescription className="mt-1 text-[13px] text-dashboard-text-secondary">
						{leadership
							? "Families see it in School OS now, and by WhatsApp once it is connected."
							: "It goes to the principal first, then to the parents of the classes you pick."}
					</DialogDescription>
				</div>

				<div>
					<label htmlFor={`${id}-title`} className="mb-2 block text-[12px] text-dashboard-text-dim">
						Title
					</label>
					<Input
						id={`${id}-title`}
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						maxLength={160}
						placeholder="Parent-teacher meeting"
						className="h-9"
					/>
				</div>

				<fieldset>
					<legend className="mb-2 text-[12px] text-dashboard-text-dim">Who gets it</legend>
					<div className="flex flex-wrap gap-2">
						{KINDS.filter((option) => leadership || !option.leadershipOnly).map((option) => (
							<button
								key={option.kind}
								type="button"
								aria-pressed={effectiveKind === option.kind}
								onClick={() => setKind(option.kind)}
								className={cn(
									"inline-flex h-8 items-center rounded-full border px-3 text-[13px] transition-colors",
									effectiveKind === option.kind
										? "border-[var(--rx-accent)] bg-[color-mix(in_oklab,var(--rx-accent)_14%,transparent)] text-dashboard-text-primary"
										: "border-dashboard-border-strong text-dashboard-text-secondary hover:bg-dashboard-hover",
								)}
							>
								{option.label}
							</button>
						))}
					</div>
					{effectiveKind === "sections" ? (
						<div className="mt-3 rounded-[10px] border border-dashboard-border">
							<div className="border-dashboard-border border-b p-2">
								<SearchInput
									value={filter}
									onValueChange={setFilter}
									placeholder="Find a class"
									aria-label="Find a class"
								/>
							</div>
							<ul className="max-h-48 overflow-y-auto py-1">
								{sections.map((section) => {
									const checked = sectionIds.includes(section.id);
									return (
										<li key={section.id}>
											<label className="flex cursor-pointer items-center gap-3 px-3 py-1.5 text-[13px] hover:bg-dashboard-hover">
												<Checkbox
													checked={checked}
													onCheckedChange={(next) =>
														setSectionIds((current) =>
															next
																? [...current, section.id]
																: current.filter((value) => value !== section.id),
														)
													}
												/>
												<span className="min-w-0 flex-1 truncate text-dashboard-text-primary">
													{section.name}{" "}
													<span className="text-dashboard-text-dim">· {section.campusName}</span>
												</span>
												<span className="shrink-0 text-[12px] text-dashboard-text-dim tabular-nums">
													{section.families} families
												</span>
											</label>
										</li>
									);
								})}
								{options.data && sections.length === 0 ? (
									<li className="px-3 py-2 text-[13px] text-dashboard-text-dim">
										No classes match.
									</li>
								) : null}
							</ul>
						</div>
					) : null}
					<p className="mt-2 text-[12px] text-dashboard-text-dim" aria-live="polite">
						{audience.kind === "sections" && audience.sectionIds.length === 0
							? "Pick at least one class."
							: preview.data
								? reachLine(preview.data.reach)
								: "Counting…"}
					</p>
				</fieldset>

				<div>
					<label htmlFor={`${id}-body`} className="mb-2 block text-[12px] text-dashboard-text-dim">
						Message
					</label>
					<Textarea
						id={`${id}-body`}
						value={body}
						onChange={(event) => setBody(event.target.value)}
						rows={5}
						maxLength={4000}
						placeholder="Sat 24 Oct, 9 AM to 12 PM in the school hall. Bring the diary."
						className="min-h-[120px] text-[14px]"
					/>
				</div>
			</div>
			<footer className="flex flex-wrap items-center justify-end gap-2 border-dashboard-border border-t px-5 py-3">
				<button
					type="button"
					onClick={onClose}
					className="me-auto inline-flex h-8 items-center rounded-[6px] px-2 text-[13px] text-dashboard-text-dim hover:text-dashboard-text-primary"
				>
					Cancel
				</button>
				<button
					type="button"
					disabled={!ready || busy}
					onClick={() => onSave(draft(), "draft")}
					className="inline-flex h-8 items-center rounded-[6px] border border-dashboard-border-strong px-3 font-medium text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover disabled:opacity-50"
				>
					Save draft
				</button>
				<button
					type="submit"
					disabled={!ready || busy}
					className="inline-flex h-8 items-center rounded-[6px] bg-[var(--rx-accent)] px-3 font-medium text-[13px] text-white hover:opacity-90 disabled:opacity-50"
				>
					{leadership ? "Send now" : "Send for approval"}
				</button>
			</footer>
		</form>
	);
}
