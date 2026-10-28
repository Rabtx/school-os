import { type ReactNode, type SelectHTMLAttributes, useId } from "react";
import { filterPillParts, filterPillSelectClass } from "./filter-pill.styles";

export type FilterPillProps = {
	/** The filter's name, shown dim before the value ("Class", "Status"). */
	label: string;
	/**
	 * The control: an app's own select or menu trigger, styled with `filterPillParts.control`.
	 * Omit it and pass `options` for a native select.
	 */
	children?: ReactNode;
	className?: string;
};

/** A filter in a list toolbar: its name, then the chosen value as the control. */
export function FilterPill({ label, children, className }: FilterPillProps) {
	return (
		<div className={`${filterPillParts.root} ${className ?? ""}`}>
			<span aria-hidden="true" className={filterPillParts.label}>
				{label}
			</span>
			{children}
		</div>
	);
}

export type FilterPillSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	options: { label: string; value: string }[];
	/** The empty choice's text, such as "Any" or "All". Omit for no empty choice. */
	placeholder?: string;
};

/**
 * A filter pill with a native select. The label is the select's accessible name, so screen
 * readers hear "Class, Grade 1-A".
 */
export function FilterPillSelect({
	label,
	value,
	onValueChange,
	options,
	placeholder,
	className,
	...rest
}: FilterPillSelectProps) {
	const id = useId();
	return (
		<FilterPill label={label} className={className}>
			<select
				{...rest}
				id={id}
				aria-label={label}
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				className={filterPillSelectClass}
			>
				{placeholder === undefined ? null : <option value="">{placeholder}</option>}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		</FilterPill>
	);
}
