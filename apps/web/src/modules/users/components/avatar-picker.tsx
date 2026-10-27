"use client";

import { ImageUploadIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@school-os/ui/components/field";
import { Spinner } from "@school-os/ui/components/spinner";
import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buildAvatarTemplates } from "../lib/avatar-templates";

export function AvatarPicker({
	seed,
	value,
	pending,
	uploading,
	onSelectTemplate,
	onUploadFile,
}: {
	seed: string;
	value: string | null | undefined;
	pending?: boolean;
	uploading?: boolean;
	onSelectTemplate: (url: string) => void;
	onUploadFile: (file: File) => void;
}) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [localError, setLocalError] = useState<string | null>(null);
	const templates = buildAvatarTemplates(seed);
	const busy = Boolean(pending || uploading);

	return (
		<Field>
			<FieldLabel>Avatar</FieldLabel>
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-4">
					<div className="relative size-16 overflow-hidden rounded-full border border-dashboard-border bg-dashboard-surface">
						{value ? (
							// oxlint-disable-next-line nextjs/no-img-element -- remote avatar URLs (upload + dicebear)
							<img src={value} alt="" className="size-full object-cover" />
						) : (
							<div className="flex size-full items-center justify-center text-[11px] text-dashboard-text-muted">
								None
							</div>
						)}
					</div>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={busy}
							onClick={() => {
								setLocalError(null);
								inputRef.current?.click();
							}}
						>
							{uploading ? (
								<Spinner data-icon="inline-start" />
							) : (
								<HugeiconsIcon icon={ImageUploadIcon} data-icon="inline-start" strokeWidth={1.8} />
							)}
							Upload photo
						</Button>
						<input
							ref={inputRef}
							id={inputId}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							className="sr-only"
							onChange={(event) => {
								const file = event.target.files?.[0];
								event.target.value = "";
								if (!file) return;
								if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
									setLocalError("Use a JPEG, PNG, or WebP image.");
									return;
								}
								if (file.size > 2 * 1024 * 1024) {
									setLocalError("Image must be 2 MB or smaller.");
									return;
								}
								setLocalError(null);
								onUploadFile(file);
							}}
						/>
					</div>
				</div>

				<div>
					<p className="mb-2 text-[12px] text-dashboard-text-muted">Or pick a template</p>
					<div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
						{templates.map((template) => {
							const selected = value === template.url;
							return (
								<Button
									key={template.id}
									variant="outline"
									size="icon"
									disabled={busy}
									title={template.label}
									aria-pressed={selected}
									onClick={() => onSelectTemplate(template.url)}
									className={cn(
										"relative aspect-square size-auto overflow-hidden rounded-xl bg-transparent transition hover:bg-transparent disabled:opacity-60 dark:bg-transparent dark:hover:bg-transparent",
										selected
											? "border-emerald-500 ring-2 ring-emerald-500/30"
											: "border-dashboard-border hover:border-dashboard-text-muted",
									)}
								>
									{/* oxlint-disable-next-line nextjs/no-img-element -- dicebear template previews */}
									<img
										src={template.url}
										alt={template.label}
										width={96}
										height={96}
										className="size-full object-cover"
									/>
									{selected ? (
										<span className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
											<HugeiconsIcon icon={Tick02Icon} className="size-3" strokeWidth={2.2} />
										</span>
									) : null}
								</Button>
							);
						})}
					</div>
				</div>

				{localError ? (
					<p className="text-[12px] text-red-500">{localError}</p>
				) : (
					<FieldDescription>
						Choose a template or upload a square photo from your device (max 2 MB).
					</FieldDescription>
				)}
			</div>
		</Field>
	);
}
