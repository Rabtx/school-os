"use client";

import { type InputHTMLAttributes, type ReactNode, type Ref, useContext, useRef } from "react";
import { FieldContext } from "../field/context";
import { type InputSize, inputClass, inputParts } from "./input.styles";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
	/** Control height: 28, 32, 36, 44 and 48. */
	size?: InputSize;
	/** A fully rounded field, for search bars. Independent of the radius mode. */
	pill?: boolean;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
	ref?: Ref<HTMLInputElement>;
};

/**
 * A native `<input>` inside a wrapper that draws the field. Put it in a `Field` to get a label, a
 * hint and an error wired up, or give it an `aria-label`. `aria-invalid` turns the edge red.
 */
export function Input({
	size,
	pill,
	leadingIcon,
	trailingIcon,
	className,
	ref,
	...rest
}: InputProps) {
	const inner = useRef<HTMLInputElement>(null);
	const fieldState = useContext(FieldContext);
	const { field, icon } = inputParts;

	return (
		// The wrapper only forwards pointer focus; keyboard users already land on the input.
		// oxlint-disable-next-line jsx-a11y/no-static-element-interactions
		<div
			className={`${inputClass({ size, pill })} ${className ?? ""}`}
			onPointerDown={(event) => {
				if (event.target instanceof Element && event.target.closest("input, button, a")) return;
				event.preventDefault();
				inner.current?.focus();
			}}
		>
			{leadingIcon && <span className={icon}>{leadingIcon}</span>}
			<input
				id={fieldState?.id}
				aria-describedby={fieldState?.describedBy}
				aria-invalid={fieldState?.invalid || undefined}
				{...rest}
				ref={(node) => {
					inner.current = node;
					if (typeof ref === "function") ref(node);
					else if (ref) ref.current = node;
				}}
				className={field}
			/>
			{trailingIcon && <span className={icon}>{trailingIcon}</span>}
		</div>
	);
}
