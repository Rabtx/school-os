import { type KeyboardEvent, useRef } from "react";
import { nextSegment, type SegmentTone, segmentClass, segmentedClass } from "./segmented.styles";

export type SegmentOption<T extends string> = { value: T; label: string; tone?: SegmentTone };

export type SegmentedControlProps<T extends string> = {
	options: SegmentOption<T>[];
	/** The chosen value, or null when nothing is chosen yet. */
	value: T | null;
	onChange: (value: T) => void;
	/** Names the group for screen readers ("Attendance for Ali Hassan"). */
	label: string;
	disabled?: boolean;
	className?: string;
};

/**
 * One choice from a few, side by side: a radio group. Tab reaches the chosen segment (or the first
 * one), and the arrow keys move the choice, as with native radios.
 */
export function SegmentedControl<T extends string>({
	options,
	value,
	onChange,
	label,
	disabled,
	className,
}: SegmentedControlProps<T>) {
	const refs = useRef(new Map<T, HTMLButtonElement>());
	const values = options.map((option) => option.value);
	const focusable = value !== null && values.includes(value) ? value : values[0];

	function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		const next = nextSegment(values, value, event.key);
		if (next === null || disabled) return;
		event.preventDefault();
		onChange(next);
		refs.current.get(next)?.focus();
	}

	return (
		<div
			role="radiogroup"
			aria-label={label}
			aria-disabled={disabled || undefined}
			className={`${segmentedClass} ${className ?? ""}`}
		>
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<button
						key={option.value}
						ref={(node) => {
							if (node) refs.current.set(option.value, node);
							else refs.current.delete(option.value);
						}}
						type="button"
						role="radio"
						aria-checked={selected}
						tabIndex={option.value === focusable ? 0 : -1}
						disabled={disabled}
						onClick={() => onChange(option.value)}
						onKeyDown={onKeyDown}
						className={segmentClass(selected, option.tone)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
