import type { ComponentType, ReactNode } from "react";
import {
	type NavCountTone,
	navCountClass,
	navCountLabel,
	navItemClass,
	navItemIconClass,
	navItemParts,
} from "./nav-item.styles";

type LinkProps = {
	href: string;
	className?: string;
	children?: ReactNode;
	onClick?: () => void;
	"aria-current"?: "page";
};

export type NavItemProps = {
	label: string;
	icon: ReactNode;
	/** A count after the label (14 homework to check); zero shows nothing. */
	count?: number;
	/** "accent" or "danger" when the count is waiting on the person, such as approvals. */
	countTone?: NavCountTone;
	/** Something else after the label, such as a "⌘K" hint. Replaces the count. */
	trailing?: ReactNode;
	href: string;
	active?: boolean;
	/** Icon-only rail; the label must then come from a tooltip or `aria-label`. */
	collapsed?: boolean;
	onNavigate?: () => void;
	/** The link component, such as Next's `Link`. Default a plain anchor. */
	linkAs?: ComponentType<LinkProps>;
};

/** One sidebar link. The active one carries `aria-current="page"`. */
export function NavItem({
	label,
	icon,
	count,
	countTone,
	trailing,
	href,
	active = false,
	collapsed = false,
	onNavigate,
	linkAs: LinkTag = "a" as never,
}: NavItemProps) {
	const countLabel = navCountLabel(count);
	return (
		<LinkTag
			href={href}
			onClick={onNavigate}
			aria-current={active ? "page" : undefined}
			className={navItemClass(active, collapsed)}
		>
			<span className={navItemIconClass(active)}>{icon}</span>
			{collapsed ? null : (
				<>
					<span className={navItemParts.label}>{label}</span>
					{trailing ??
						(countLabel ? <span className={navCountClass(countTone)}>{countLabel}</span> : null)}
				</>
			)}
		</LinkTag>
	);
}

/** A sidebar group: a small heading (or a short rule when collapsed) over its rows. */
export function NavSection({
	heading,
	collapsed = false,
	action,
	children,
}: {
	heading: string;
	collapsed?: boolean;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<div>
			{collapsed ? (
				<div className={navItemParts.collapsedRule} />
			) : (
				<div className={navItemParts.section}>
					<span className={navItemParts.sectionHeading}>{heading}</span>
					{action}
				</div>
			)}
			<ul className="space-y-0.5">{children}</ul>
		</div>
	);
}
