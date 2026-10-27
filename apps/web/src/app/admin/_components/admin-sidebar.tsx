"use client";

import {
	Logout01Icon,
	SecurityIcon,
	Settings02Icon,
	SidebarLeftIcon,
	Tick02Icon,
	UnfoldMoreIcon,
	UserCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@school-os/ui/components/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@school-os/ui/components/tooltip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { userInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { useTenantContext, useWorkspaceSwitcherPolicy } from "@/modules/tenants";
import { useSessionStore } from "@/store";
import { AdminNavigationMenu } from "./admin-navigation-menu";

type School = { id: string; name: string; kind: string; mark: string };

function campusMark(name: string, code: string): string {
	const fromCode = code.replace(/[^A-Za-z0-9]/g, "").slice(0, 2);
	if (fromCode) return fromCode.toUpperCase();
	return name.trim().charAt(0).toUpperCase() || "S";
}

// Figma "App Icon": 24px tile, white highlight over the school's colour.
function WorkspaceMark({ label }: { label: string }) {
	return (
		<div
			className="flex size-6 shrink-0 items-center justify-center rounded-md font-medium text-[13px] text-white leading-none"
			style={{
				backgroundImage:
					"linear-gradient(180deg, rgb(255 255 255 / 0.3) 0%, rgb(255 255 255 / 0) 100%), linear-gradient(90deg, var(--rx-success) 0%, var(--rx-success) 100%)",
			}}
		>
			{label}
		</div>
	);
}

function WorkspaceName({ title, hint }: { title: string; hint: string }) {
	return (
		<div className="min-w-0 flex-1 tracking-[-0.15px]">
			<div className="truncate font-medium text-[13px] text-dashboard-text-primary leading-5">
				{title}
			</div>
			<div className="truncate text-[12px] text-dashboard-text-dim leading-4">{hint}</div>
		</div>
	);
}

type AdminSidebarProps = {
	className?: string;
	mobile?: boolean;
	onNavigate?: () => void;
};

export function AdminSidebar({ className, mobile = false, onNavigate }: AdminSidebarProps) {
	const router = useRouter();
	const { user, logout } = useAuth();
	const { activeTenant, activeCampus, campuses, setActiveCampusId, setActiveTenantId } =
		useTenantContext();
	const tenants = useSessionStore((state) => state.tenants);
	const workspacePolicy = useWorkspaceSwitcherPolicy();
	const [collapsed, setCollapsed] = useState(false);

	const schools: School[] = campuses.map((campus) => ({
		id: campus.id,
		name: campus.name,
		kind: campus.code,
		mark: campusMark(campus.name, campus.code),
	}));
	const schoolId = activeCampus?.id ?? schools[0]?.id ?? "";
	const school = schools.find((s) => s.id === schoolId) ?? schools[0];
	const tenantLabel = activeTenant?.name ?? "Organization";
	const isCollapsed = !mobile && collapsed;
	const workspaceTitle = !workspacePolicy.allowCampusSwitch
		? workspacePolicy.workspaceSubtitle.includes("children")
			? tenantLabel
			: (school?.name ?? tenantLabel)
		: (school?.name ?? "Add a campus");
	const workspaceHint = !workspacePolicy.allowCampusSwitch
		? workspacePolicy.workspaceSubtitle
		: tenantLabel;
	const canOpenWorkspaceMenu =
		workspacePolicy.allowCampusSwitch || workspacePolicy.allowOrganizationSwitch;
	const width = mobile ? "w-full" : isCollapsed ? "w-[52px]" : "w-[240px]";
	const displayName = user?.username ?? "Account";
	const displayEmail = user?.email ?? "";
	const initials = userInitials(displayName);
	const mark = school?.mark ?? tenantLabel.charAt(0).toUpperCase();

	async function handleLogout() {
		await logout();
		router.push("/login");
	}

	return (
		<aside
			className={cn(
				"relative flex h-full min-h-0 shrink-0 flex-col gap-3 overflow-hidden border-dashboard-border border-e bg-dashboard-sidebar-bg p-2 transition-[width] duration-200 ease-out",
				width,
				className,
			)}
		>
			{/* Workspace switcher */}
			<div className={cn("flex items-center gap-2", isCollapsed && "flex-col", mobile && "pe-10")}>
				{canOpenWorkspaceMenu ? (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={(props) => (
								<button
									type="button"
									{...props}
									className={cn(
										"group/trigger flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-start transition-colors hover:bg-dashboard-hover",
										isCollapsed && "flex-none justify-center",
									)}
								>
									<WorkspaceMark label={mark} />
									{!isCollapsed && (
										<>
											<WorkspaceName title={workspaceTitle} hint={workspaceHint} />
											<HugeiconsIcon
												icon={UnfoldMoreIcon}
												size={16}
												strokeWidth={1.8}
												className="shrink-0 text-dashboard-text-dim transition-colors group-hover/trigger:text-dashboard-text-secondary"
											/>
										</>
									)}
								</button>
							)}
						/>
						<DropdownMenuContent
							align="start"
							sideOffset={8}
							className="w-[232px] border-dashboard-border bg-dashboard-surface text-dashboard-text-secondary"
						>
							{workspacePolicy.allowOrganizationSwitch && tenants.length > 1 ? (
								<>
									<DropdownMenuGroup>
										<DropdownMenuLabel className="text-[10.5px] text-dashboard-text-dim uppercase">
											Organizations
										</DropdownMenuLabel>
									</DropdownMenuGroup>
									{tenants.map((tenant) => (
										<DropdownMenuItem
											key={tenant.id}
											onClick={() => setActiveTenantId(tenant.id)}
											className="gap-3 focus:bg-dashboard-hover-strong"
										>
											<div className="truncate font-medium text-[13px]">{tenant.name}</div>
											{tenant.id === activeTenant?.id ? (
												<HugeiconsIcon
													icon={Tick02Icon}
													size={16}
													className="ms-auto text-dashboard-accent"
												/>
											) : null}
										</DropdownMenuItem>
									))}
									<DropdownMenuSeparator className="bg-dashboard-border" />
								</>
							) : null}
							{workspacePolicy.allowCampusSwitch ? (
								<>
									<DropdownMenuGroup>
										<DropdownMenuLabel className="text-[10.5px] text-dashboard-text-dim uppercase">
											Switch campus
										</DropdownMenuLabel>
									</DropdownMenuGroup>
									<DropdownMenuSeparator className="bg-dashboard-border" />
									{schools.length === 0 ? (
										<DropdownMenuItem
											render={
												<Link
													href={
														activeTenant
															? `/admin/tenants/${activeTenant.id}/campuses`
															: "/admin/onboarding/tenant"
													}
													onClick={onNavigate}
												/>
											}
											className="gap-3 focus:bg-dashboard-hover-strong"
										>
											<div className="text-[13px] text-dashboard-text-muted">
												Add your first campus
											</div>
										</DropdownMenuItem>
									) : (
										schools.map((s) => {
											const selected = s.id === schoolId;
											return (
												<DropdownMenuItem
													key={s.id}
													onClick={() => setActiveCampusId(s.id)}
													className="gap-3 focus:bg-dashboard-hover-strong"
												>
													<WorkspaceMark label={s.mark} />
													<div className="min-w-0 flex-1">
														<div className="truncate font-medium text-[13px]">{s.name}</div>
														<div className="text-[11px] text-dashboard-text-dim">{s.kind}</div>
													</div>
													{selected ? (
														<HugeiconsIcon
															icon={Tick02Icon}
															size={16}
															className="text-dashboard-accent"
														/>
													) : null}
												</DropdownMenuItem>
											);
										})
									)}
								</>
							) : null}
						</DropdownMenuContent>
					</DropdownMenu>
				) : (
					<div
						className={cn(
							"flex min-w-0 flex-1 items-center gap-2 p-1",
							isCollapsed && "flex-none justify-center",
						)}
					>
						<WorkspaceMark label={mark} />
						{!isCollapsed && <WorkspaceName title={workspaceTitle} hint={workspaceHint} />}
					</div>
				)}
				{!mobile && (
					<Tooltip>
						<TooltipTrigger
							render={(props) => (
								<button
									type="button"
									{...props}
									onClick={() => setCollapsed((v) => !v)}
									aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
									className="flex size-6 shrink-0 items-center justify-center rounded-md text-dashboard-text-dim transition-colors hover:bg-dashboard-hover hover:text-dashboard-text-primary"
								>
									<HugeiconsIcon
										icon={SidebarLeftIcon}
										size={16}
										strokeWidth={1.8}
										className="rtl:scale-x-[-1]"
									/>
								</button>
							)}
						/>
						<TooltipContent side="right">
							{collapsed ? "Expand sidebar" : "Collapse sidebar"}
						</TooltipContent>
					</Tooltip>
				)}
			</div>

			{/* Nav */}
			<nav
				className={cn(
					"min-h-0 flex-1 overflow-y-auto overscroll-contain",
					"[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-dashboard-border [&::-webkit-scrollbar-track]:bg-transparent",
				)}
			>
				<AdminNavigationMenu isCollapsed={isCollapsed} mobile={mobile} onNavigate={onNavigate} />
			</nav>

			{/* User card */}
			<div>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={(props) => (
							<button
								type="button"
								{...props}
								className={cn(
									"flex w-full items-center gap-2 rounded-lg p-1 text-start transition-colors hover:bg-dashboard-hover",
									isCollapsed && "justify-center",
								)}
							>
								<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--rx-success)_22%,transparent)] font-medium text-[11px] text-dashboard-text-primary">
									{initials}
								</div>
								{!isCollapsed && (
									<>
										<WorkspaceName title={displayName} hint={displayEmail} />
										<HugeiconsIcon
											icon={Settings02Icon}
											size={16}
											strokeWidth={1.8}
											className="shrink-0 text-dashboard-text-dim"
										/>
									</>
								)}
							</button>
						)}
					/>
					<DropdownMenuContent
						align="start"
						side="top"
						sideOffset={8}
						className="w-[232px] border-dashboard-border bg-dashboard-surface text-dashboard-text-secondary"
					>
						<DropdownMenuGroup>
							<DropdownMenuLabel className="font-normal">
								<div className="min-w-0">
									<div className="truncate font-medium text-[13px] text-dashboard-text-primary">
										{displayName}
									</div>
									<div className="truncate text-[11px] text-dashboard-text-dim">{displayEmail}</div>
								</div>
							</DropdownMenuLabel>
						</DropdownMenuGroup>
						<DropdownMenuSeparator className="bg-dashboard-border" />
						<DropdownMenuItem
							render={<Link href="/admin/account/profile" onClick={onNavigate} />}
							className="gap-2 focus:bg-dashboard-hover-strong"
						>
							<HugeiconsIcon icon={UserCircle02Icon} size={16} strokeWidth={1.8} />
							Profile
						</DropdownMenuItem>
						<DropdownMenuItem
							render={<Link href="/admin/account/security" onClick={onNavigate} />}
							className="gap-2 focus:bg-dashboard-hover-strong"
						>
							<HugeiconsIcon icon={SecurityIcon} size={16} strokeWidth={1.8} />
							Account security
						</DropdownMenuItem>
						<DropdownMenuSeparator className="bg-dashboard-border" />
						<DropdownMenuItem
							onClick={() => void handleLogout()}
							className="gap-2 focus:bg-dashboard-hover-strong"
						>
							<HugeiconsIcon icon={Logout01Icon} size={16} strokeWidth={1.8} />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</aside>
	);
}
