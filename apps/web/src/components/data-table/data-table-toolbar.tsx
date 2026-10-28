"use client";

import { Add01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { FilterPill, filterPillParts } from "@rabtx/ui/filter-pill";
import { Button } from "@school-os/ui/components/button";
import { SearchInput } from "@school-os/ui/components/search-input";
import { SelectField } from "@school-os/ui/components/select-field";
import { cn } from "@/lib/utils";

export type DataTableFilterConfig = {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	items: { label: string; value: string }[];
	placeholder?: string;
	nullable?: boolean;
};

type Props = {
	search?: string;
	onSearchChange?: (value: string) => void;
	searchPlaceholder?: string;
	filters?: DataTableFilterConfig[];
	onAdd?: () => void;
	addLabel?: string;
	canAdd?: boolean;
	children?: React.ReactNode;
	className?: string;
};

const NO_FILTERS: NonNullable<Props["filters"]> = [];

export function DataTableToolbar({
	search,
	onSearchChange,
	searchPlaceholder = "Search…",
	filters = NO_FILTERS,
	onAdd,
	addLabel = "Add row",
	canAdd = false,
	children,
	className,
}: Props) {
	return (
		<div
			className={cn(
				"flex flex-col gap-2 border-dashboard-border border-b px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between",
				className,
			)}
		>
			<div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
				{onSearchChange ? (
					<SearchInput
						className="h-7 w-full rounded-full sm:w-[240px]"
						value={search ?? ""}
						onValueChange={onSearchChange}
						placeholder={searchPlaceholder}
						aria-label="Search table"
					/>
				) : null}

				{filters.map((filter) => (
					<FilterPill key={filter.id} label={filter.label}>
						<SelectField
							aria-label={filter.label}
							value={filter.value}
							onValueChange={filter.onChange}
							items={filter.items}
							placeholder={filter.placeholder ?? "Any"}
							nullable={filter.nullable ?? true}
							className={`${filterPillParts.control} dark:bg-transparent`}
						/>
					</FilterPill>
				))}
			</div>

			<div className="flex items-center gap-2">
				{children}
				{canAdd && onAdd ? (
					<Button type="button" size="sm" className="h-7 rounded-full" onClick={onAdd}>
						<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" strokeWidth={2} />
						{addLabel}
					</Button>
				) : null}
			</div>
		</div>
	);
}
