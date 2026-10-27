"use client";

import { type InputHTMLAttributes, type Ref, useEffect, useRef } from "react";
import { checkboxClass, checkboxLabelClass } from "./checkbox.styles";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> & {
	/** The partly-checked look, such as a "select all" with some children chosen. */
	mixed?: boolean;
	ref?: Ref<HTMLInputElement>;
};

/**
 * A native checkbox. With children it renders a `<label>` around the box, so the text is the
 * accessible name and the whole row is clickable. Without children, give it an `aria-label`.
 * `mixed` is derived state: the browser clears it when the user clicks, so set it again from your
 * own state.
 */
export function Checkbox({ mixed, className, children, ref, ...rest }: CheckboxProps) {
	const inner = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (inner.current) inner.current.indeterminate = !!mixed;
	}, [mixed]);

	const input = (
		<input
			{...rest}
			type="checkbox"
			ref={(node) => {
				inner.current = node;
				if (typeof ref === "function") ref(node);
				else if (ref) ref.current = node;
			}}
			className={children ? checkboxClass : `${checkboxClass} ${className ?? ""}`}
		/>
	);

	if (!children) return input;
	return (
		<label className={`${checkboxLabelClass} ${className ?? ""}`}>
			{input}
			{children}
		</label>
	);
}
