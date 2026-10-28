"use client";

import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { StateMessage, stateButtonClass } from "./state-message";

export type ActiveFilter = { key: string; label: string; onRemove: () => void };

const NO_FILTERS: ActiveFilter[] = [];

/**
 * Figma "No results" (`208:93912`): what matched nothing, the filters responsible as removable
 * chips, and one click to clear them all.
 */
export function NoResults({
	noun,
	description,
	filters = NO_FILTERS,
	onClearAll,
}: {
	/** Plural of what is listed: "students", "guardians". */
	noun: string;
	description?: string;
	filters?: ActiveFilter[];
	onClearAll?: () => void;
}) {
	return (
		<StateMessage
			mark="0"
			title={`No ${noun} match`}
			description={
				description ??
				(filters.length > 0
					? "Remove a filter or clear them all."
					: `There are no ${noun} here yet.`)
			}
		>
			{filters.length > 0 ? (
				<>
					<ul aria-label="Active filters" className="flex w-full flex-wrap justify-center gap-2">
						{filters.map((filter) => (
							<li key={filter.key}>
								<button
									type="button"
									onClick={filter.onRemove}
									aria-label={`Remove filter ${filter.label}`}
									className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-[color-mix(in_oklab,var(--rx-accent)_55%,transparent)] bg-[color-mix(in_oklab,var(--rx-accent)_12%,transparent)] px-2.5 text-[13px] text-dashboard-text-primary hover:bg-[color-mix(in_oklab,var(--rx-accent)_20%,transparent)]"
								>
									{filter.label}
									<HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={2} />
								</button>
							</li>
						))}
					</ul>
					{onClearAll ? (
						<button type="button" onClick={onClearAll} className={stateButtonClass("primary")}>
							Clear filters
						</button>
					) : null}
				</>
			) : null}
		</StateMessage>
	);
}
