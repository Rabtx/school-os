"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Dialog, DialogContent, DialogTitle } from "@school-os/ui/components/dialog";
import { useRouter } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Avatar } from "@rabtx/ui/avatar";
import { cn } from "@/lib/utils";
import { resolveNavigationIcon, useAdminNavigationQuery } from "@/modules/navigation";
import { useStudentsQuery } from "@/modules/students";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";

type Result = {
	id: string;
	group: "Go to" | "Classes" | "Students";
	label: string;
	hint?: string;
	href: string;
	icon?: IconSvgElement;
	avatar?: string;
};

const MAX_PER_GROUP = { "Go to": 6, Classes: 5, Students: 6 } as const;

const CommandSearchContext = createContext<{ open: () => void } | null>(null);

/** Opens the command search; used by the sidebar Search row and the topbar search box. */
export function useCommandSearch() {
	const context = useContext(CommandSearchContext);
	if (!context) throw new Error("useCommandSearch must be used within CommandSearchProvider");
	return context;
}

function matches(text: string, query: string): boolean {
	return text.toLowerCase().includes(query);
}

/**
 * Figma "Command search" (`209:105359`): ⌘K (Ctrl+K) from anywhere in admin opens one box that
 * goes to pages, classes and students. Arrow keys move, Enter opens, Escape closes. Asking School
 * OS a question here arrives with the AI layer.
 */
export function CommandSearchProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const openSearch = useCallback(() => setOpen(true), []);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
				event.preventDefault();
				setOpen((current) => !current);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	const value = useMemo(() => ({ open: openSearch }), [openSearch]);

	return (
		<CommandSearchContext.Provider value={value}>
			{children}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={false}
					initialFocus={inputRef}
					className="top-[12%] translate-y-0 gap-0 overflow-hidden border border-dashboard-border-strong bg-dashboard-surface p-0 tracking-[-0.15px] sm:max-w-[560px] rtl:translate-y-0"
				>
					{open ? <CommandSearchPanel inputRef={inputRef} onClose={() => setOpen(false)} /> : null}
				</DialogContent>
			</Dialog>
		</CommandSearchContext.Provider>
	);
}

function CommandSearchPanel({
	onClose,
	inputRef,
}: {
	onClose: () => void;
	inputRef: React.RefObject<HTMLInputElement | null>;
}) {
	const router = useRouter();
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const [query, setQuery] = useState("");
	const [activeIndex, setActiveIndex] = useState(0);
	const listRef = useRef<HTMLDivElement>(null);

	const navigationQuery = useAdminNavigationQuery(tenantId);
	const studentsQuery = useStudentsQuery(tenantId, campusId, can(PermissionCodes.STUDENTS_READ));

	const results = useMemo((): Result[] => {
		const needle = query.trim().toLowerCase();
		const pages = (navigationQuery.data?.sections ?? [])
			.flatMap((section) => section.items.flatMap((item) => [item, ...item.children]))
			.filter((item) => item.href && (!needle || matches(item.label, needle)))
			.map((item): Result => ({
				id: `page-${item.id}`,
				group: "Go to",
				label: item.label,
				hint: item.count === undefined ? undefined : item.count.toLocaleString(),
				href: item.href ?? "/admin",
				icon: resolveNavigationIcon(item.iconKey),
			}));
		const classes = needle
			? (navigationQuery.data?.classes ?? [])
					.filter((item) => matches(item.label, needle))
					.map((item): Result => ({
						id: `class-${item.sectionId}`,
						group: "Classes",
						label: item.label,
						hint: `${item.studentCount} students`,
						href: `/admin/attendance?sectionId=${item.sectionId}`,
					}))
			: [];
		const students = needle
			? (studentsQuery.data ?? [])
					.filter(
						(student) =>
							matches(student.fullName, needle) ||
							matches(student.studentCode, needle) ||
							(student.phone ? matches(student.phone, needle) : false),
					)
					.map((student): Result => ({
						id: `student-${student.id}`,
						group: "Students",
						label: student.fullName,
						hint: student.studentCode,
						href: `/admin/students?student=${student.id}`,
						avatar: student.fullName,
					}))
			: [];
		return [
			...pages.slice(0, MAX_PER_GROUP["Go to"]),
			...classes.slice(0, MAX_PER_GROUP.Classes),
			...students.slice(0, MAX_PER_GROUP.Students),
		];
	}, [navigationQuery.data, query, studentsQuery.data]);

	const index = Math.min(activeIndex, Math.max(results.length - 1, 0));

	useEffect(() => {
		listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
	}, [index]);

	const go = (result: Result | undefined) => {
		if (!result) return;
		onClose();
		router.push(result.href);
	};

	const groups = ["Go to", "Classes", "Students"] as const;
	const searchingStudents = query.trim() !== "" && studentsQuery.isLoading;

	return (
		<>
			<DialogTitle className="sr-only">Search School OS</DialogTitle>
			<div className="flex items-center gap-3 border-dashboard-border border-b px-4">
				<HugeiconsIcon
					icon={Search01Icon}
					size={16}
					strokeWidth={1.8}
					className="shrink-0 text-dashboard-text-dim"
				/>
				<input
					ref={inputRef}
					value={query}
					onChange={(event) => {
						setQuery(event.target.value);
						setActiveIndex(0);
					}}
					onKeyDown={(event) => {
						if (event.key === "ArrowDown") {
							event.preventDefault();
							setActiveIndex(Math.min(index + 1, results.length - 1));
						} else if (event.key === "ArrowUp") {
							event.preventDefault();
							setActiveIndex(Math.max(index - 1, 0));
						} else if (event.key === "Enter") {
							event.preventDefault();
							go(results[index]);
						}
					}}
					role="combobox"
					aria-expanded
					aria-controls="command-search-results"
					aria-activedescendant={results[index] ? `command-${results[index].id}` : undefined}
					placeholder="Search pages, classes and students"
					className="h-12 min-w-0 flex-1 bg-transparent text-[15px] text-dashboard-text-primary outline-none placeholder:text-dashboard-text-dim"
				/>
				<kbd className="rounded-[4px] border border-dashboard-border-strong px-1.5 text-[11px] text-dashboard-text-dim">
					esc
				</kbd>
			</div>

			<div
				ref={listRef}
				id="command-search-results"
				role="listbox"
				aria-label="Results"
				className="max-h-[min(420px,60vh)] overflow-y-auto p-2"
			>
				{results.length === 0 ? (
					<p className="px-3 py-8 text-center text-[13px] text-dashboard-text-dim">
						{searchingStudents ? "Searching…" : `Nothing matches "${query.trim()}".`}
					</p>
				) : (
					groups.map((group) => {
						const items = results.filter((result) => result.group === group);
						if (items.length === 0) return null;
						return (
							<div key={group} role="group" aria-label={group} className="mb-1 last:mb-0">
								<p className="px-3 pt-2 pb-1 text-[12px] text-dashboard-text-dim">{group}</p>
								{items.map((result) => {
									const position = results.indexOf(result);
									const active = position === index;
									return (
										<div
											key={result.id}
											id={`command-${result.id}`}
											role="option"
											tabIndex={-1}
											aria-selected={active}
											data-index={position}
											onMouseMove={() => setActiveIndex(position)}
											onClick={() => go(result)}
											onKeyDown={(event) => event.key === "Enter" && go(result)}
											className={cn(
												"flex h-10 cursor-pointer items-center gap-3 rounded-[8px] px-3 text-[14px]",
												active
													? "bg-dashboard-hover-strong text-dashboard-text-primary"
													: "text-dashboard-text-secondary",
											)}
										>
											{result.avatar ? (
												<Avatar name={result.avatar} />
											) : result.icon ? (
												<HugeiconsIcon icon={result.icon} size={16} strokeWidth={1.8} />
											) : (
												<span aria-hidden className="size-2 rounded-full bg-[var(--rx-accent)]" />
											)}
											<span className="min-w-0 flex-1 truncate">{result.label}</span>
											{result.hint ? (
												<span className="shrink-0 text-[12px] text-dashboard-text-dim tabular-nums">
													{result.hint}
												</span>
											) : null}
										</div>
									);
								})}
							</div>
						);
					})
				)}
			</div>

			<footer className="flex flex-wrap gap-x-4 gap-y-1 border-dashboard-border border-t px-4 py-2.5 text-[12px] text-dashboard-text-dim">
				<span>↑↓ to move</span>
				<span>Enter to open</span>
				<span>Esc to close</span>
			</footer>
		</>
	);
}
