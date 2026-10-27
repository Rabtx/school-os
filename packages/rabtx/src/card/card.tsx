import type { HTMLAttributes } from "react";
import { type CardPadding, cardClass } from "./card.styles";

export type CardProps = HTMLAttributes<HTMLElement> & {
	/** The element to render, for correct semantics. Default `div`. */
	as?: "div" | "section" | "article" | "aside" | "li";
	/** Inner padding: 12, 16 (default) or 20. */
	padding?: CardPadding;
};

/** A container with the shared surface, the box radius and a vertical stack. */
export function Card({ as: Tag = "div", padding, className, ...rest }: CardProps) {
	return <Tag {...rest} className={`${cardClass(padding)} ${className ?? ""}`} />;
}
