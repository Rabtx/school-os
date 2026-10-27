"use client";

import { type Ref, type TextareaHTMLAttributes, useContext } from "react";
import { FieldContext } from "../field/context";
import { textareaClass } from "./textarea.styles";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
	ref?: Ref<HTMLTextAreaElement>;
};

/**
 * A native `<textarea>` drawn as a field. Put it in a `Field` to get a label, a hint and an error
 * wired up, or give it an `aria-label`. `aria-invalid` turns the edge red.
 */
export function Textarea({ className, ...rest }: TextareaProps) {
	const field = useContext(FieldContext);

	return (
		<textarea
			id={field?.id}
			aria-describedby={field?.describedBy}
			aria-invalid={field?.invalid || undefined}
			{...rest}
			className={`${textareaClass} ${className ?? ""}`}
		/>
	);
}
