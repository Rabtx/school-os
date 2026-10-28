"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@school-os/ui/components/dialog";
import { Input } from "@school-os/ui/components/input";
import { useToast } from "@school-os/ui/components/toaster";
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type ConfirmOptions = {
	title: string;
	/** Who or what this is: "Class 7-B · SO-0207". */
	subtitle?: string;
	/** "What happens" rows: the consequences, stated before anything happens. */
	consequences?: { label: string; value: string }[];
	/** When set, the person types this exactly before the action unlocks. */
	typeToConfirm?: string;
	/** Footer line on the start side, e.g. whether it can be undone. */
	note?: string;
	confirmLabel: string;
	tone?: "danger" | "neutral";
};

type Pending = ConfirmOptions & { resolve: (confirmed: boolean) => void };

const ConfirmContext = createContext<((options: ConfirmOptions) => Promise<boolean>) | null>(null);

/**
 * Figma "Confirm a risky action" (`208:106059`). `useConfirm()` returns `confirm(options)`, which
 * resolves true when the person confirms and false when they cancel or close.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [pending, setPending] = useState<Pending | null>(null);
	const [typed, setTyped] = useState("");
	const pendingRef = useRef<Pending | null>(null);
	const typedRef = useRef<HTMLInputElement>(null);
	const confirmRef = useRef<HTMLButtonElement>(null);

	const confirm = useCallback(
		(options: ConfirmOptions) =>
			new Promise<boolean>((resolve) => {
				pendingRef.current?.resolve(false);
				const next = { ...options, resolve };
				pendingRef.current = next;
				setTyped("");
				setPending(next);
			}),
		[],
	);

	const settle = (confirmed: boolean) => {
		pendingRef.current?.resolve(confirmed);
		pendingRef.current = null;
		setPending(null);
	};

	const locked = Boolean(pending?.typeToConfirm) && typed.trim() !== pending?.typeToConfirm?.trim();
	const danger = (pending?.tone ?? "danger") === "danger";

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			<Dialog open={Boolean(pending)} onOpenChange={(open) => !open && settle(false)}>
				<DialogContent
					initialFocus={pending?.typeToConfirm ? typedRef : confirmRef}
					className="gap-0 overflow-hidden border border-dashboard-border-strong bg-dashboard-surface p-0 tracking-[-0.15px] sm:max-w-[480px]"
				>
					{pending ? (
						<form
							onSubmit={(event) => {
								event.preventDefault();
								if (!locked) settle(true);
							}}
						>
							<div className="px-5 pt-5 pb-4">
								<DialogTitle className="pe-8 font-medium text-[22px] text-dashboard-text-primary leading-7">
									{pending.title}
								</DialogTitle>
								{pending.subtitle ? (
									<DialogDescription className="mt-1 text-[13px] text-dashboard-text-secondary">
										{pending.subtitle}
									</DialogDescription>
								) : null}

								{pending.consequences?.length ? (
									<div className="mt-5">
										<p className="mb-2 text-[12px] text-dashboard-text-dim">What happens</p>
										<dl className="grid grid-cols-[minmax(0,140px)_1fr] gap-x-4 gap-y-2 rounded-[8px] bg-dashboard-bg px-3 py-2.5 text-[13px]">
											{pending.consequences.map((row) => (
												<div key={row.label} className="contents">
													<dt className="text-dashboard-text-dim">{row.label}</dt>
													<dd className="text-dashboard-text-primary">{row.value}</dd>
												</div>
											))}
										</dl>
									</div>
								) : null}

								{pending.typeToConfirm ? (
									<label className="mt-5 block">
										<span className="mb-2 block text-[12px] text-dashboard-text-dim">
											Type{" "}
											<span className="text-dashboard-text-primary">{pending.typeToConfirm}</span>{" "}
											to confirm
										</span>
										<Input
											ref={typedRef}
											value={typed}
											onChange={(event) => setTyped(event.target.value)}
											aria-label={`Type ${pending.typeToConfirm} to confirm`}
											className="h-9"
										/>
									</label>
								) : null}
							</div>

							<footer className="flex flex-wrap items-center gap-2 border-dashboard-border border-t px-5 py-3">
								<p className="min-w-0 flex-1 text-[12px] text-dashboard-text-dim">{pending.note}</p>
								<button
									type="button"
									onClick={() => settle(false)}
									className="inline-flex h-8 items-center rounded-[6px] border border-dashboard-border-strong px-3 font-medium text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
								>
									Cancel
								</button>
								<button
									type="submit"
									ref={confirmRef}
									disabled={locked}
									className={cn(
										"inline-flex h-8 items-center rounded-[6px] px-3 font-medium text-[13px] text-white hover:opacity-90 disabled:opacity-50",
										danger ? "bg-[var(--rx-danger)]" : "bg-[var(--rx-accent)]",
									)}
								>
									{pending.confirmLabel}
								</button>
							</footer>
						</form>
					) : null}
				</DialogContent>
			</Dialog>
		</ConfirmContext.Provider>
	);
}

export function useConfirm() {
	const confirm = useContext(ConfirmContext);
	if (!confirm) throw new Error("useConfirm must be used within ConfirmProvider");
	return confirm;
}

/**
 * Confirm, then run, then report: `run(options)` asks first, performs `action` only on confirm,
 * and shows a success toast or the error. Resolves true when the action ran and succeeded.
 */
export function useConfirmedAction() {
	const confirm = useConfirm();
	const toast = useToast();
	return useCallback(
		async (
			options: ConfirmOptions & {
				action: () => Promise<unknown>;
				success: string;
				failure: string;
			},
		): Promise<boolean> => {
			const { action, success, failure, ...dialog } = options;
			if (!(await confirm(dialog))) return false;
			try {
				await action();
				toast.show({ title: success, status: "success" });
				return true;
			} catch (error) {
				toast.show({
					title: failure,
					description: error instanceof Error ? error.message : undefined,
					status: "error",
				});
				return false;
			}
		},
		[confirm, toast],
	);
}
