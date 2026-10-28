"use client";

import {
	Add01Icon,
	ArrowDown01Icon,
	ArrowUp01Icon,
	File02Icon,
	Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	type NavCountTone,
	NavSection,
	navCountClass,
	navCountLabel,
	navItemClass,
	navItemIconClass,
	navItemParts,
} from "@rabtx/ui/nav-item";
import { Skeleton } from "@school-os/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@school-os/ui/components/tooltip";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useDashboardI18n } from "@/modules/dashboard";
import {
	type NavigationClass,
	type NavigationNode,
	resolveActiveNavigationKey,
	resolveNavigationIcon,
	useAdminNavigationQuery,
} from "@/modules/navigation";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { useCommandSearch } from "./command-search/command-search";

type Props = {
	isCollapsed: boolean;
	mobile?: boolean;
	onNavigate?: () => void;
};

/** Sections rendered elsewhere: "Account" lives in the user menu. */
const HIDDEN_SECTIONS = new Set(["Account"]);

/** Figma class swatches, cycled by position. */
const CLASS_SWATCHES = [
	"bg-[var(--rx-accent)]",
	"bg-[var(--rx-success)]",
	"bg-[var(--rx-violet)]",
	"bg-[var(--rx-warning)]",
];

const MAX_SIDEBAR_CLASSES = 6;

const REPORT_LINKS = [
	{ tab: "attendance", label: "Attendance report" },
	{ tab: "grades", label: "Grades report" },
	{ tab: "homework", label: "Homework report" },
];

const rowClass = navItemClass;

export function AdminNavigationMenu({ isCollapsed, mobile = false, onNavigate }: Props) {
	const pathname = usePathname();
	const commandSearch = useCommandSearch();
	const searchParams = useSearchParams();
	const { activeTenant, activeCampus } = useTenantContext();
	const { can } = usePermissions();
	const navigationQuery = useAdminNavigationQuery(activeTenant?.id ?? null);
	const { dir } = useDashboardI18n();
	const tooltipSide: "left" | "right" = dir === "rtl" ? "left" : "right";
	const wrapCollapsed = isCollapsed && !mobile;

	const sections = useMemo(
		() => (navigationQuery.data?.sections ?? []).filter((s) => !HIDDEN_SECTIONS.has(s.heading)),
		[navigationQuery.data],
	);
	const flatItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);
	const activeKey = resolveActiveNavigationKey(pathname, flatItems);
	const classes = useMemo(
		() =>
			(navigationQuery.data?.classes ?? []).filter(
				(item) => !activeCampus || item.campusId === activeCampus.id,
			),
		[activeCampus, navigationQuery.data],
	);

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

	const primary = sections.find((section) => section.heading === "Primary");
	const others = sections.filter((section) => section.heading !== "Primary");
	const activeSectionId = pathname.startsWith("/admin/attendance")
		? searchParams.get("sectionId")
		: null;
	const activeReportTab = pathname.startsWith("/admin/reports") ? searchParams.get("tab") : null;
	const itemProps = { isCollapsed, activeKey, pathname, onNavigate, wrapCollapsed, tooltipSide };

	return (
		<div className="flex flex-col gap-4">
			<ul className="space-y-0.5">
				<li>
					<NavRow
						label="Search"
						collapsed={isCollapsed}
						wrapCollapsed={wrapCollapsed}
						tooltipSide={tooltipSide}
						icon={<HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={1.8} />}
						trailing={<span className="text-[12px] text-dashboard-text-dim">⌘K</span>}
						onClick={() => {
							onNavigate?.();
							commandSearch.open();
						}}
					/>
				</li>
				{(primary?.items ?? []).map((item) => (
					<AdminNavigationItem key={item.id} item={item} {...itemProps} />
				))}
			</ul>

			{classes.length > 0 ? (
				<NavGroup
					heading="Classes"
					collapsed={isCollapsed}
					action={
						can(PermissionCodes.ACADEMIC_WRITE) ? (
							<Link
								href="/admin/academics/sections"
								onClick={onNavigate}
								aria-label="Add a class"
								className="flex size-5 items-center justify-center rounded-md text-dashboard-text-dim hover:bg-dashboard-hover hover:text-dashboard-text-primary"
							>
								<HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.8} />
							</Link>
						) : null
					}
				>
					{classes.slice(0, MAX_SIDEBAR_CLASSES).map((item, index) => (
						<ClassRow
							key={item.sectionId}
							item={item}
							swatch={CLASS_SWATCHES[index % CLASS_SWATCHES.length] ?? ""}
							active={activeSectionId === item.sectionId}
							collapsed={isCollapsed}
							wrapCollapsed={wrapCollapsed}
							tooltipSide={tooltipSide}
							onNavigate={onNavigate}
						/>
					))}
					{classes.length > MAX_SIDEBAR_CLASSES ? (
						<li>
							<Link
								href="/admin/academics/sections"
								onClick={onNavigate}
								className={cn(rowClass(false, isCollapsed), "text-dashboard-text-dim")}
							>
								{isCollapsed ? "…" : `All ${classes.length} classes`}
							</Link>
						</li>
					) : null}
				</NavGroup>
			) : null}

			{others.map((section) => (
				<NavGroup key={section.heading} heading={section.heading} collapsed={isCollapsed}>
					{section.items.map((item) => (
						<AdminNavigationItem key={item.id} item={item} {...itemProps} />
					))}
				</NavGroup>
			))}

			{can(PermissionCodes.ASSESSMENTS_READ) ? (
				<NavGroup heading="Reports" collapsed={isCollapsed}>
					{REPORT_LINKS.map((report) => (
						<li key={report.tab}>
							<NavRow
								label={report.label}
								href={`/admin/reports?tab=${report.tab}`}
								active={activeReportTab === report.tab}
								collapsed={isCollapsed}
								wrapCollapsed={wrapCollapsed}
								tooltipSide={tooltipSide}
								onNavigate={onNavigate}
								icon={<HugeiconsIcon icon={File02Icon} size={16} strokeWidth={1.8} />}
							/>
						</li>
					))}
				</NavGroup>
			) : null}
		</div>
	);
}

function NavGroup({
	heading,
	collapsed,
	action,
	children,
}: {
	heading: string;
	collapsed: boolean;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<NavSection heading={heading} collapsed={collapsed} action={action}>
			{children}
		</NavSection>
	);
}

/** One sidebar row: icon, label and an optional trailing count or hint. */
function NavRow({
	label,
	icon,
	trailing,
	href,
	active = false,
	collapsed,
	wrapCollapsed,
	tooltipSide,
	onClick,
	onNavigate,
}: {
	label: string;
	icon: ReactNode;
	trailing?: ReactNode;
	href?: string | null;
	active?: boolean;
	collapsed: boolean;
	wrapCollapsed: boolean;
	tooltipSide: "left" | "right";
	onClick?: () => void;
	onNavigate?: () => void;
}) {
	const body = (
		<>
			<span className={navItemIconClass(active)}>{icon}</span>
			{collapsed ? null : (
				<>
					<span className={navItemParts.label}>{label}</span>
					{trailing}
				</>
			)}
		</>
	);
	const element = href ? (
		<Link
			href={href}
			className={rowClass(active, collapsed)}
			onClick={onNavigate}
			aria-current={active ? "page" : undefined}
		>
			{body}
		</Link>
	) : (
		<button
			type="button"
			className={rowClass(active, collapsed)}
			onClick={onClick}
			disabled={!onClick}
		>
			{body}
		</button>
	);

	if (!wrapCollapsed) return element;
	return (
		<Tooltip>
			<TooltipTrigger render={() => element} />
			<TooltipContent side={tooltipSide}>{label}</TooltipContent>
		</Tooltip>
	);
}

/** Counts that wait on the person read as a filled pill, as in the Figma sidebar. */
const COUNT_TONE: Record<string, NavCountTone> = { approvals: "accent" };

function CountBadge({ value, tone }: { value?: number; tone?: NavCountTone }) {
	const label = navCountLabel(value);
	if (!label) return null;
	return <span className={navCountClass(tone)}>{label}</span>;
}

function ClassRow({
	item,
	swatch,
	active,
	collapsed,
	wrapCollapsed,
	tooltipSide,
	onNavigate,
}: {
	item: NavigationClass;
	swatch: string;
	active: boolean;
	collapsed: boolean;
	wrapCollapsed: boolean;
	tooltipSide: "left" | "right";
	onNavigate?: () => void;
}) {
	return (
		<li>
			<NavRow
				label={item.label}
				href={`/admin/attendance?sectionId=${item.sectionId}`}
				active={active}
				collapsed={collapsed}
				wrapCollapsed={wrapCollapsed}
				tooltipSide={tooltipSide}
				onNavigate={onNavigate}
				icon={<span aria-hidden className={cn("size-3 rounded-[3px]", swatch)} />}
				trailing={<CountBadge value={item.studentCount} />}
			/>
		</li>
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

	const row = (
		<NavRow
			label={item.label}
			href={item.href}
			active={item.key === activeKey}
			collapsed={isCollapsed && depth === 0}
			wrapCollapsed={wrapCollapsed && depth === 0}
			tooltipSide={tooltipSide}
			onNavigate={onNavigate}
			icon={
				<HugeiconsIcon icon={resolveNavigationIcon(item.iconKey)} size={16} strokeWidth={1.8} />
			}
			trailing={<CountBadge value={item.count} tone={COUNT_TONE[item.key]} />}
		/>
	);

	if (!hasChildren || isCollapsed) return <li>{row}</li>;

	return (
		<li className="space-y-0.5">
			<div className="flex items-center gap-0.5">
				<div className="min-w-0 flex-1">{row}</div>
				<button
					type="button"
					className="flex size-6 shrink-0 items-center justify-center rounded-md text-dashboard-text-dim hover:bg-dashboard-hover hover:text-dashboard-text-secondary"
					aria-expanded={open}
					aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
					onClick={() => setOpen((value) => !value)}
				>
					<HugeiconsIcon icon={open ? ArrowUp01Icon : ArrowDown01Icon} size={14} strokeWidth={2} />
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
		</li>
	);
}
