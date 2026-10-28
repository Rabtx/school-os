import type { ReactNode } from "react";
import {
	type EmptyStateTone,
	emptyStateMarkClass,
	emptyStateParts,
	emptyStateRole,
} from "./empty-state.styles";

export type EmptyStateProps = {
	/** What sits in the circle: a count, "!" or an icon. Decorative. */
	mark: ReactNode;
	title: string;
	description?: ReactNode;
	/** The buttons that get the person unstuck. */
	children?: ReactNode;
	tone?: EmptyStateTone;
	/** Heading level for the title, so it fits the page outline. Default 2. */
	headingLevel?: 2 | 3;
	className?: string;
};

/** The centred message for empty, no-results, no-access and error states. */
export function EmptyState({
	mark,
	title,
	description,
	children,
	tone,
	headingLevel = 2,
	className,
}: EmptyStateProps) {
	const Heading = headingLevel === 3 ? "h3" : "h2";
	return (
		<div role={emptyStateRole(tone)} className={`${emptyStateParts.root} ${className ?? ""}`}>
			<span aria-hidden="true" className={emptyStateMarkClass(tone)}>
				{mark}
			</span>
			<Heading className={emptyStateParts.title}>{title}</Heading>
			{description ? <p className={emptyStateParts.description}>{description}</p> : null}
			{children ? <div className={emptyStateParts.actions}>{children}</div> : null}
		</div>
	);
}
