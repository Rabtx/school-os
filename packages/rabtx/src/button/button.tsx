"use client";

import type { ButtonHTMLAttributes, MouseEvent, ReactNode, Ref } from "react";
import { type ButtonSize, type ButtonVariant, buttonClass, buttonParts } from "./button.styles";

type BaseProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	/** Swaps the content for a spinner at the same width and blocks clicks. */
	loading?: boolean;
	/** Removes the press scale. */
	static?: boolean;
	ref?: Ref<HTMLButtonElement>;
};

type LabelProps = BaseProps & {
	iconOnly?: false;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
	children: ReactNode;
};

type IconOnlyProps = BaseProps & {
	/** A square button. It has no visible text, so it needs an accessible name. */
	iconOnly: true;
	"aria-label": string;
	leadingIcon?: never;
	trailingIcon?: never;
	children: ReactNode;
};

export type ButtonProps = LabelProps | IconOnlyProps;

/** A native `<button>`. Icons are passed in, so the package depends on no icon set. */
export function Button(props: ButtonProps) {
	const {
		variant,
		size,
		iconOnly,
		loading,
		static: isStatic,
		leadingIcon,
		trailingIcon,
		children,
		className,
		type = "button",
		onClick,
		...rest
	} = props;
	const { content, icon, label, spinner } = buttonParts;

	return (
		<button
			{...rest}
			type={type}
			className={`${buttonClass({ variant, size, iconOnly })} ${className ?? ""}`}
			data-loading={loading ? "" : undefined}
			data-static={isStatic ? "" : undefined}
			aria-busy={loading || undefined}
			onClick={(event: MouseEvent<HTMLButtonElement>) =>
				loading ? event.preventDefault() : onClick?.(event)
			}
		>
			<span className={content}>
				{iconOnly ? (
					<span className={icon}>{children}</span>
				) : (
					<>
						{leadingIcon && <span className={icon}>{leadingIcon}</span>}
						<span className={label}>{children}</span>
						{trailingIcon && <span className={icon}>{trailingIcon}</span>}
					</>
				)}
			</span>
			<span className={spinner} aria-hidden="true" />
		</button>
	);
}
