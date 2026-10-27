"use client";

import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Skeleton } from "@school-os/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@school-os/ui/components/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useDashboardI18n } from "@/modules/dashboard";
import {
	type NavigationNode,
	type NavigationSection,
	resolveActiveNavigationKey,
	resolveNavigationIcon,
	useAdminNavigationQuery,
} from "@/modules/navigation";
import { useTenantContext } from "@/modules/tenants";

type Props = {
	isCollapsed: boolean;
	mobile?: boolean;
	onNavigate?: () => void;
};

export function AdminNavigationMenu({ isCollapsed, mobile = false, onNavigate }: Props) {
	const pathname = usePathname();
	const { activeTenant } = useTenantContext();
	const navigationQuery = useAdminNavigationQuery(activeTenant?.id ?? null);
	const { dir } = useDashboardI18n();
	const tooltipSide = dir === "rtl" ? "left" : "right";

	const sections = useMemo(() => navigationQuery.data?.sections ?? [], [navigationQuery.data]);
	const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);
	const activeKey = resolveActiveNavigationKey(pathname, flatItems);

	if (navigationQuery.isLoading) {
		return (
			<div className="space-y-1 py-1">
				{["a", "b", "c", "d", "e", "f"].map((key) => (
					<Skeleton key={key} className="h-7 w-full rounded-lg" />
				))}
			</div>
		);
	}

	if (sections.length === 0) {
		return (
			<div className="px-2 py-6 text-[12px] text-dashboard-text-dim">
				No navigation available for your role.
			</div>
		);
	}

	return (
		<>
			{sections.map((section, idx) => (
				<AdminNavigationSection
					key={section.heading}
					section={section}
					idx={idx}
					isCollapsed={isCollapsed}
					activeKey={activeKey}
					pathname={pathname}
					onNavigate={onNavigate}
					wrapCollapsed={isCollapsed && !mobile}
					tooltipSide={tooltipSide}
				/>
			))}
		</>
	);
}

function AdminNavigationSection({
	section,
	idx,
	isCollapsed,
	activeKey,
	pathname,
	onNavigate,
	wrapCollapsed,
	tooltipSide,
}: {
	section: NavigationSection;
	idx: number;
	isCollapsed: boolean;
	activeKey: string;
	pathname: string;
	onNavigate?: () => void;
	wrapCollapsed: boolean;
	tooltipSide: "left" | "right";
}) {
	return (
		<div className={cn(idx > 0 && "mt-4")}>
			{!isCollapsed ? (
				<div className="flex h-7 items-center px-2 font-medium text-[11px] text-dashboard-text-dim uppercase tracking-[0.08em]">
					{section.heading}
				</div>
			) : (
				idx > 0 && <div className="h-1" />
			)}
			<ul className="space-y-0.5">
				{section.items.map((item) => (
					<AdminNavigationItem
						key={item.id}
						item={item}
						isCollapsed={isCollapsed}
						activeKey={activeKey}
						pathname={pathname}
						onNavigate={onNavigate}
						wrapCollapsed={wrapCollapsed}
						tooltipSide={tooltipSide}
					/>
				))}
			</ul>
		</div>
	);
}

function AdminNavigationItem({
	item,
	isCollapsed,
	activeKey,
	pathname,
	onNavigate,
	wrapCollapsed,
	tooltipSide,
	depth = 0,
}: {
	item: NavigationNode;
	isCollapsed: boolean;
	activeKey: string;
	pathname: string;
	onNavigate?: () => void;
	wrapCollapsed: boolean;
	tooltipSide: "left" | "right";
	depth?: number;
}) {
	const hasChildren = item.children.length > 0;
	const branchActive =
		item.key === activeKey ||
		item.children.some((child) => child.key === activeKey) ||
		(item.href != null && pathname.startsWith(`${item.href}/`));
	const [open, setOpen] = useState(branchActive);

	useEffect(() => {
		if (branchActive) setOpen(true);
	}, [branchActive]);

	const active = item.key === activeKey;
	const icon = resolveNavigationIcon(item.iconKey);
	const className = cn(
		"group/item relative flex h-7 w-full items-center gap-2 rounded-lg px-2 text-start text-[13px] tracking-[-0.15px] transition-colors duration-150",
		isCollapsed && depth === 0 && "justify-center px-0",
		active
			? "bg-dashboard-hover font-medium text-dashboard-text-primary"
			: "font-normal text-dashboard-text-secondary hover:bg-dashboard-hover hover:text-dashboard-text-primary",
	);

	const iconNode = (
		<HugeiconsIcon
			icon={icon}
			size={16}
			strokeWidth={1.8}
			className={cn(
				"shrink-0 transition-colors",
				active
					? "text-dashboard-text-primary"
					: "text-dashboard-text-dim group-hover/item:text-dashboard-text-secondary",
			)}
		/>
	);

	const label = !isCollapsed ? <span className="truncate">{item.label}</span> : null;

	const linkBody = item.href ? (
		<Link href={item.href} className={className} onClick={onNavigate}>
			{iconNode}
			{label}
		</Link>
	) : (
		<button type="button" className={className} disabled>
			{iconNode}
			{label}
		</button>
	);

	const renderedLink =
		wrapCollapsed && depth === 0 ? (
			<Tooltip>
				<TooltipTrigger render={() => linkBody} />
				<TooltipContent side={tooltipSide}>{item.label}</TooltipContent>
			</Tooltip>
		) : (
			linkBody
		);

	return (
		<li>
			{hasChildren && !isCollapsed ? (
				<div className="space-y-0.5">
					<div className="flex items-center gap-0.5">
						<div className="min-w-0 flex-1">{renderedLink}</div>
						<button
							type="button"
							className="flex size-6 shrink-0 items-center justify-center rounded-md text-dashboard-text-dim hover:bg-dashboard-hover hover:text-dashboard-text-secondary"
							aria-expanded={open}
							aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
							onClick={() => setOpen((value) => !value)}
						>
							<HugeiconsIcon
								icon={open ? ArrowUp01Icon : ArrowDown01Icon}
								size={14}
								strokeWidth={2}
							/>
						</button>
					</div>
					{open ? (
						<ul className="ms-4 space-y-0.5 border-dashboard-border border-s ps-1.5">
							{item.children.map((child) => (
								<AdminNavigationItem
									key={child.id}
									item={child}
									isCollapsed={isCollapsed}
									activeKey={activeKey}
									pathname={pathname}
									onNavigate={onNavigate}
									wrapCollapsed={wrapCollapsed}
									tooltipSide={tooltipSide}
									depth={depth + 1}
								/>
							))}
						</ul>
					) : null}
				</div>
			) : (
				renderedLink
			)}
		</li>
	);
}
