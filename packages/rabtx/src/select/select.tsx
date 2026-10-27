"use client";

import { type ReactNode, type Ref, type SelectHTMLAttributes, useContext } from "react";
import { FieldContext } from "../field/context";
import { type SelectSize, selectClass, selectFieldClass, selectParts } from "./select.styles";

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
	/** Control height: 28, 32 or 36. */
	size?: SelectSize;
	leadingIcon?: ReactNode;
	/** Shown, in the placeholder color, until an option is chosen. */
	placeholder?: string;
	ref?: Ref<HTMLSelectElement>;
};

/**
 * A native `<select>` drawn as a field, with `<option>` children. The browser supplies the
 * keyboard, typeahead, screen reader and mobile behavior. Put it in a `Field` to get a label, a
 * hint and an error wired up, or give it an `aria-label`.
 */
export function Select({
	size,
	leadingIcon,
	placeholder,
	className,
	children,
	value,
	defaultValue,
	ref,
	...rest
}: SelectProps) {
	const fieldState = useContext(FieldContext);
	const { icon, leading, trailing } = selectParts;
	const initial =
		value === undefined
			? { defaultValue: defaultValue ?? (placeholder === undefined ? undefined : "") }
			: { value };

	return (
		<div className={`${selectClass(size)} ${className ?? ""}`}>
			{leadingIcon && <span className={`${icon} ${leading}`}>{leadingIcon}</span>}
			<select
				id={fieldState?.id}
				aria-describedby={fieldState?.describedBy}
				aria-invalid={fieldState?.invalid || undefined}
				{...rest}
				{...initial}
				ref={ref}
				className={selectFieldClass(!!leadingIcon)}
			>
				{placeholder !== undefined && (
					<option value="" disabled hidden>
						{placeholder}
					</option>
				)}
				{children}
			</select>
			<span aria-hidden="true" className={`${icon} ${trailing}`}>
				{/* HugeIcons "unfold more" (MIT), inlined so the package needs no icon set. */}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M18 14C18 14 13.5811 19 12 19C10.4188 19 6 14 6 14" />
					<path d="M18 9.99996C18 9.99996 13.5811 5.00001 12 5C10.4188 4.99999 6 10 6 10" />
				</svg>
			</span>
		</div>
	);
}
