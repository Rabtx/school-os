import {
	BubbleChatIcon,
	Building03Icon,
	Calendar03Icon,
	CheckmarkCircle02Icon,
	ClipboardIcon,
	DashboardSquare01Icon,
	File01Icon,
	GridViewIcon,
	HelpCircleIcon,
	Invoice01Icon,
	Layers01Icon,
	Megaphone01Icon,
	Mortarboard01Icon,
	PuzzleIcon,
	SecurityIcon,
	Settings02Icon,
	StudentIcon,
	TeacherIcon,
	UserAdd01Icon,
	UserCircle02Icon,
	UserMultiple02Icon,
	UserSettings01Icon,
} from "@hugeicons/core-free-icons";
import type { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

type IconType = ComponentProps<typeof HugeiconsIcon>["icon"];

const NAVIGATION_ICON_REGISTRY: Record<string, IconType> = {
	dashboard: DashboardSquare01Icon,
	approvals: CheckmarkCircle02Icon,
	"ai-assist": BubbleChatIcon,
	messages: BubbleChatIcon,
	attendance: ClipboardIcon,
	calendar: Calendar03Icon,
	file: File01Icon,
	megaphone: Megaphone01Icon,
	student: StudentIcon,
	"user-multiple": UserMultiple02Icon,
	teacher: TeacherIcon,
	"user-add": UserAdd01Icon,
	invoice: Invoice01Icon,
	mortarboard: Mortarboard01Icon,
	layers: Layers01Icon,
	grid: GridViewIcon,
	"user-settings": UserSettings01Icon,
	puzzle: PuzzleIcon,
	help: HelpCircleIcon,
	homework: File01Icon,
	settings: Settings02Icon,
	building: Building03Icon,
	"user-circle": UserCircle02Icon,
	security: SecurityIcon,
};

export function resolveNavigationIcon(iconKey: string | null | undefined): IconType {
	if (!iconKey) return DashboardSquare01Icon;
	return NAVIGATION_ICON_REGISTRY[iconKey] ?? DashboardSquare01Icon;
}

export function flattenNavigationHrefs(
	items: Array<{ href: string | null; children?: Array<{ href: string | null }> }>,
): string[] {
	const hrefs: string[] = [];
	for (const item of items) {
		if (item.href) hrefs.push(item.href);
		for (const child of item.children ?? []) {
			if (child.href) hrefs.push(child.href);
		}
	}
	return hrefs;
}

export function resolveActiveNavigationKey(
	pathname: string,
	items: Array<{
		key: string;
		href: string | null;
		children?: Array<{ key: string; href: string | null }>;
	}>,
): string {
	const matches: Array<{ key: string; href: string }> = [];
	for (const item of items) {
		if (item.href) matches.push({ key: item.key, href: item.href });
		for (const child of item.children ?? []) {
			if (child.href) matches.push({ key: child.key, href: child.href });
		}
	}

	const sorted = matches.toSorted((a, b) => b.href.length - a.href.length);
	const hit = sorted.find(
		(entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`),
	);
	return hit?.key ?? "dashboard";
}
