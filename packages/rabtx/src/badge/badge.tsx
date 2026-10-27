import type { HTMLAttributes } from "react";
import { type BadgeTone, badgeClass, badgeParts } from "./badge.styles";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
	tone?: BadgeTone;
	/** A small dot before the label. */
	dot?: boolean;
};

/** A short status label. The words carry the meaning; the tone only supports them. */
export function Badge({ tone, dot, className, children, ...rest }: BadgeProps) {
	return (
		<span {...rest} className={`${badgeClass(tone)} ${className ?? ""}`}>
			{dot && <span aria-hidden="true" className={badgeParts.dot} />}
			{children}
		</span>
	);
}
