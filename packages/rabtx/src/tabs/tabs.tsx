import type { ComponentType, ReactNode } from "react";
import { tabClass, tabsClass } from "./tabs.styles";

export type TabItem = { label: ReactNode; href: string; active?: boolean };

type LinkProps = {
	href: string;
	className?: string;
	children?: ReactNode;
	"aria-current"?: "page";
};

export type TabNavProps = {
	items: TabItem[];
	/** Names the navigation for screen readers ("Homework sections"). */
	label: string;
	/** The link component, such as Next's `Link`. Default a plain anchor. */
	linkAs?: ComponentType<LinkProps>;
	className?: string;
};

/**
 * Page sections as links under the page header. Each tab is a URL, so a section can be shared
 * and the back button works; the active one carries `aria-current="page"`.
 */
export function TabNav({ items, label, linkAs: LinkTag = "a" as never, className }: TabNavProps) {
	return (
		<nav aria-label={label} className={`${tabsClass} ${className ?? ""}`}>
			{items.map((item) => (
				<LinkTag
					key={item.href}
					href={item.href}
					aria-current={item.active ? "page" : undefined}
					className={tabClass(Boolean(item.active))}
				>
					{item.label}
				</LinkTag>
			))}
		</nav>
	);
}
