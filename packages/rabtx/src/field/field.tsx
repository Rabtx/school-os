"use client";

import { type ReactNode, useId } from "react";
import { FieldContext } from "./context";
import { fieldParts } from "./field.styles";

export type FieldProps = {
	label: ReactNode;
	/** Helper text under the control. */
	hint?: ReactNode;
	/** Replaces the hint, marks the control invalid and is announced when it appears. */
	error?: ReactNode;
	className?: string;
	/** One control, such as an Input. It receives the id, the description and the invalid state. */
	children: ReactNode;
};

/** A label, a control and an optional hint or error, linked for assistive technology. */
export function Field({ label, hint, error, className, children }: FieldProps) {
	const id = useId();
	const message = error ?? hint;
	const { root, label: labelClass, message: messageClass } = fieldParts;

	return (
		<FieldContext
			value={{ id, describedBy: message ? `${id}-message` : undefined, invalid: !!error }}
		>
			<div className={`${root} ${className ?? ""}`}>
				<label htmlFor={id} className={labelClass}>
					{label}
				</label>
				{children}
				{message && (
					<p
						id={`${id}-message`}
						aria-live="polite"
						data-invalid={error ? "" : undefined}
						className={messageClass}
					>
						{message}
					</p>
				)}
			</div>
		</FieldContext>
	);
}
