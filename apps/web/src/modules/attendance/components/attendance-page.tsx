"use client";

import { Calendar03Icon, ClipboardIcon, QrCodeIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Button } from "@school-os/ui/components/button";
import { DatePicker } from "@school-os/ui/components/date-picker";
import { SearchInput } from "@school-os/ui/components/search-input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Skeleton } from "@school-os/ui/components/skeleton";
import { Spinner } from "@school-os/ui/components/spinner";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { useClassesQuery, useSectionsQuery } from "@/modules/academic";
import { formatSectionLabel } from "@/modules/academic/utils/format-section-label";
import {
	useConfirmAllPresentMutation,
	useGetOrCreateSessionMutation,
	useMarkAttendanceMutation,
} from "@/modules/attendance/hooks/use-attendance-queries";
import type { AttendanceMarkStatus } from "@/modules/attendance/types/attendance.types";
import {
	useMySectionStudentsQuery,
	useMyTeacherProfileQuery,
} from "@/modules/staff/hooks/use-staff-queries";
import { useSectionEnrollmentsQuery, useStudentsQuery } from "@/modules/students";
import {
	PermissionCodes,
	useOrganizationConfigQuery,
	usePermissions,
	useTenantContext,
} from "@/modules/tenants";
import { AttendanceScannerPanel, type ScanResult } from "../scanner/attendance-scanner-panel";
import { scanFeedback } from "../scanner/scan-feedback";
import {
	type AttendanceStatusFilter,
	buildSmartDefaultDraft,
	computeDraftSummary,
	filterRosterByStatus,
} from "../utils/attendance-ui.utils";
import { AttendanceRollCallTable } from "./attendance-roll-call-table";

/** Layout-matched skeleton for the session form card. */
function SessionFormSkeleton() {
	return (
		<div className="rounded-[14px] border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
			<div className="mb-4 flex items-center gap-2">
				<Skeleton className="size-4 rounded" />
				<Skeleton className="h-4 w-28 rounded-md" />
				<Skeleton className="h-5 w-32 rounded-full" />
			</div>
			<div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
				<div className="space-y-1.5">
					<Skeleton className="h-3 w-14 rounded" />
					<Skeleton className="h-9 w-full rounded-lg" />
				</div>
				<div className="space-y-1.5">
					<Skeleton className="h-3 w-10 rounded" />
					<Skeleton className="h-9 w-full rounded-lg" />
				</div>
				<div className="flex items-end">
					<Skeleton className="h-9 w-32 rounded-lg" />
				</div>
			</div>
			<Skeleton className="mt-4 h-12 w-full rounded-lg" />
		</div>
	);
}

/** Layout-matched skeleton for the live summary strip. */
function SummaryStripSkeleton() {
	return (
		<div className="rounded-[14px] border border-dashboard-border bg-dashboard-surface p-4 sm:p-5">
			<div className="flex items-center justify-between gap-3">
				<div className="space-y-1.5">
					<Skeleton className="h-3.5 w-24 rounded" />
					<Skeleton className="h-3 w-44 rounded" />
				</div>
				<Skeleton className="hidden h-8 w-[160px] rounded-md sm:block" />
			</div>
			<div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
				{["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"].map((skKey) => (
					<div
						key={skKey}
						className="space-y-1.5 rounded-[12px] border border-dashboard-border bg-dashboard-surface px-3 py-2.5"
					>
						<Skeleton className="h-2.5 w-12 rounded" />
						<Skeleton className="h-5 w-8 rounded" />
					</div>
				))}
			</div>
			<Skeleton className="mt-3 h-1.5 w-full rounded-full" />
		</div>
	);
}

const PILL_CONTROL =
	"h-full min-w-[120px] rounded-none border-0 bg-transparent font-medium text-[13px] text-dashboard-text-primary shadow-none dark:bg-transparent";

/** Figma filter pill: tertiary label, then the control. */
function FilterPill({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div className="flex h-7 items-center overflow-hidden rounded-full border border-dashboard-border-strong bg-dashboard-surface">
			<span className="flex h-full shrink-0 items-center border-dashboard-border border-e px-3 text-dashboard-text-dim">
				{label}
			</span>
			{children}
		</div>
	);
}

export function AttendancePage() {
	const reduce = useReducedMotion();
	const searchParams = useSearchParams();
	const initialSectionId = searchParams.get("sectionId") ?? "";
	const initialSessionDate = searchParams.get("sessionDate") ?? "";
	const wantConfirmAll = searchParams.get("confirmAll") === "1";
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, role, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canRead = can(PermissionCodes.ATTENDANCE_READ);
	const canMark = can(PermissionCodes.ATTENDANCE_MARK);
	const canReadAcademic = can(PermissionCodes.ACADEMIC_READ);
	const isTeacherScoped = role === "teacher" && !can(PermissionCodes.TENANT_MEMBERSHIP_READ);

	const sectionsQuery = useSectionsQuery(tenantId, campusId, canRead && !isTeacherScoped);
	const classesQuery = useClassesQuery(tenantId, canReadAcademic);
	const myProfileQuery = useMyTeacherProfileQuery(tenantId, canRead && isTeacherScoped);
	const studentsQuery = useStudentsQuery(tenantId, campusId, canRead && !isTeacherScoped);
	const orgConfigQuery = useOrganizationConfigQuery(tenantId, canRead);

	const classNameById = useMemo(
		() => new Map((classesQuery.data ?? []).map((item) => [item.id, item.name])),
		[classesQuery.data],
	);
	const campusNameById = useMemo(
		() => new Map(campuses.map((campus) => [campus.id, campus.name])),
		[campuses],
	);

	const selectableSections = useMemo(() => {
		if (isTeacherScoped) {
			return (
				myProfileQuery.data?.homeroomSections ??
				myProfileQuery.data?.accessibleSections.filter(
					(section) => section.accessType === "homeroom",
				) ??
				[]
			);
		}
		return (sectionsQuery.data ?? []).filter(
			(section) => !campusId || section.campusId === campusId,
		);
	}, [
		campusId,
		isTeacherScoped,
		myProfileQuery.data?.accessibleSections,
		myProfileQuery.data?.homeroomSections,
		sectionsQuery.data,
	]);

	const sectionSelectItems = useMemo(
		() =>
			selectableSections.map((section) => ({
				label: formatSectionLabel(
					section,
					classNameById.get(section.classId),
					campusNameById.get(section.campusId),
				),
				value: section.id,
			})),
		[campusNameById, classNameById, selectableSections],
	);

	const [sectionId, setSectionId] = useState(initialSectionId);
	const [sessionDate, setSessionDate] = useState(
		() => initialSessionDate || new Date().toLocaleDateString("en-CA"),
	);
	const [sessionId, setSessionId] = useState<string | null>(null);
	// One-way latch: once a session has loaded, the attendance content subtree stays
	// mounted forever. This prevents the whole summary/toolbar/roster/sticky-bar subtree
	// from unmounting (and visually "jumping") when the section or date changes and the
	// sessionId transitions — only the data inside swaps, never the component tree.
	const [sessionLoaded, setSessionLoaded] = useState(false);
	const [savedMarks, setSavedMarks] = useState<Record<string, AttendanceMarkStatus>>({});
	const [markDraft, setMarkDraft] = useState<Record<string, AttendanceMarkStatus>>({});
	const [statusFilter, setStatusFilter] = useState<AttendanceStatusFilter>("all");
	const [search, setSearch] = useState("");
	const [scanMode, setScanMode] = useState(false);
	const [lastScanResult, setLastScanResult] = useState<ScanResult | null>(null);
	const [highlightStudentId, setHighlightStudentId] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const autoLoadedKey = useRef<string | null>(null);
	const confirmAllRan = useRef(false);

	const canMarkThisSection =
		canMark && (!isTeacherScoped || selectableSections.some((section) => section.id === sectionId));

	const enrollmentsQuery = useSectionEnrollmentsQuery(
		tenantId,
		sectionId || null,
		Boolean(sectionId) && !isTeacherScoped,
	);
	const sectionStudentsQuery = useMySectionStudentsQuery(
		tenantId,
		sectionId || null,
		Boolean(sectionId) && isTeacherScoped,
	);
	const loadSession = useGetOrCreateSessionMutation(tenantId ?? "");
	const markAttendance = useMarkAttendanceMutation(tenantId ?? "", sessionId ?? "");
	const confirmAllPresent = useConfirmAllPresentMutation(tenantId ?? "");

	/** True while a filter change is loading a new session — used for subtle UI feedback. */
	const isSwitchingSection =
		loadSession.isPending ||
		(isTeacherScoped ? sectionStudentsQuery.isFetching : enrollmentsQuery.isFetching);

	/**
	 * True while the session for the *current* section/date is being fetched. Unlike
	 * `isSwitchingSection` (which also covers the initial load), this is only set once a
	 * session has already been shown, so the content subtree stays mounted and only the
	 * data inside it swaps during a section/date change.
	 */
	const isSwitchingSession = sessionLoaded && isSwitchingSection;

	const applySessionView = useCallback(
		(result: Awaited<ReturnType<typeof loadSession.mutateAsync>>) => {
			setSessionId(result.session.id);
			setSessionLoaded(true);
			const existing: Record<string, AttendanceMarkStatus> = {};
			for (const mark of result.marks) {
				existing[mark.studentId] = mark.status;
			}
			setSavedMarks(existing);
			setMarkDraft(existing);
		},
		[],
	);

	const graceMinutes = orgConfigQuery.data?.settings.attendanceGraceMinutes ?? 15;
	const selectedSection = selectableSections.find((section) => section.id === sectionId);

	useEffect(() => {
		if (sectionId || sectionSelectItems.length !== 1) return;
		setSectionId(sectionSelectItems[0]?.value ?? "");
	}, [sectionId, sectionSelectItems]);

	useEffect(() => {
		if (!initialSectionId || sectionId) return;
		if (sectionSelectItems.some((item) => item.value === initialSectionId)) {
			setSectionId(initialSectionId);
		}
	}, [initialSectionId, sectionId, sectionSelectItems]);

	const rosterStudents = useMemo(() => {
		if (isTeacherScoped) {
			return (sectionStudentsQuery.data ?? [])
				.map((row) => row.student)
				.toSorted((a, b) => a.fullName.localeCompare(b.fullName));
		}

		const students = studentsQuery.data ?? [];
		const studentMap = new Map(students.map((student) => [student.id, student]));
		return (enrollmentsQuery.data ?? [])
			.filter((enrollment) => enrollment.status === "active")
			.map((enrollment) => studentMap.get(enrollment.studentId))
			.filter((student): student is NonNullable<typeof student> => Boolean(student))
			.toSorted((a, b) => a.fullName.localeCompare(b.fullName));
	}, [enrollmentsQuery.data, isTeacherScoped, sectionStudentsQuery.data, studentsQuery.data]);

	const rosterIds = useMemo(() => rosterStudents.map((student) => student.id), [rosterStudents]);
	const rollNumbers = useMemo(
		() => new Map(rosterIds.map((id, index) => [id, index + 1])),
		[rosterIds],
	);

	const liveSummary = useMemo(
		() => computeDraftSummary(rosterIds, markDraft),
		[rosterIds, markDraft],
	);

	const filteredRoster = useMemo(() => {
		const query = search.trim().toLowerCase();
		let ids = filterRosterByStatus(rosterIds, markDraft, statusFilter);
		if (query) {
			ids = ids.filter((id) => {
				const student = rosterStudents.find((row) => row.id === id);
				if (!student) return false;
				return (
					student.fullName.toLowerCase().includes(query) ||
					student.studentCode.toLowerCase().includes(query)
				);
			});
		}
		return rosterStudents.filter((student) => ids.includes(student.id));
	}, [rosterIds, markDraft, statusFilter, search, rosterStudents]);

	const unsavedCount = useMemo(() => {
		return rosterIds.filter((id) => {
			const draft = markDraft[id] ?? "unknown";
			const baseline = savedMarks[id] ?? "present";
			return draft !== baseline;
		}).length;
	}, [rosterIds, markDraft, savedMarks]);

	const loadSessionForSelection = useCallback(async () => {
		if (!sectionId) {
			setError("Select a section");
			return;
		}
		setError(null);
		setMessage(null);
		try {
			const result = await loadSession.mutateAsync({ sectionId, sessionDate });
			applySessionView(result);
			setStatusFilter("all");
			setMessage(`Session ready · ${result.session.sessionDate}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not load attendance session");
		}
	}, [applySessionView, loadSession, sectionId, sessionDate]);

	useEffect(() => {
		if (!sectionId || !sessionDate || !tenantId) return;
		const key = `${sectionId}:${sessionDate}`;
		if (autoLoadedKey.current === key) return;
		autoLoadedKey.current = key;
		// Don't clear sessionId/savedMarks/markDraft here — keepPreviousData on the
		// roster queries and the mutation's onSuccess (applySessionView) handle the
		// transition so the UI never collapses mid-switch.
		void loadSessionForSelection();
	}, [sectionId, sessionDate, tenantId, loadSessionForSelection]);

	useEffect(() => {
		if (!sessionId || rosterIds.length === 0) return;
		setMarkDraft(buildSmartDefaultDraft(rosterIds, savedMarks));
	}, [sessionId, rosterIds, savedMarks]);

	const handleConfirmAllPresentSave = useCallback(async () => {
		if (!sessionId) {
			setError("Load a session first");
			return;
		}
		if (!canMarkThisSection) {
			setError("You do not have permission to mark attendance for this section");
			return;
		}
		if (rosterIds.length === 0) {
			setError("No enrolled students found for this section");
			return;
		}
		setError(null);
		setMessage(null);
		try {
			const result = await confirmAllPresent.mutateAsync({ sessionId });
			applySessionView(result);
			setMessage("All students marked present and saved · parent alerts queue when enabled");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not confirm attendance");
		}
	}, [applySessionView, canMarkThisSection, confirmAllPresent, rosterIds.length, sessionId]);

	useEffect(() => {
		if (!wantConfirmAll || !sessionId || !canMarkThisSection || rosterIds.length === 0) return;
		if (confirmAllRan.current) return;
		confirmAllRan.current = true;
		void handleConfirmAllPresentSave();
	}, [
		wantConfirmAll,
		sessionId,
		canMarkThisSection,
		rosterIds.length,
		handleConfirmAllPresentSave,
	]);

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to mark attendance.</AlertDescription>
			</Alert>
		);
	}

	if (permissionsLoading || (isTeacherScoped && myProfileQuery.isLoading)) {
		return (
			<div className="mx-auto w-full max-w-6xl space-y-4 px-4 py-6 sm:px-6">
				<SessionFormSkeleton />
				<SummaryStripSkeleton />
				<SessionFormSkeleton />
			</div>
		);
	}

	if (!canRead) {
		return (
			<Alert>
				<AlertDescription>You do not have permission to view attendance.</AlertDescription>
			</Alert>
		);
	}

	if (isTeacherScoped && selectableSections.length === 0) {
		return (
			<Alert>
				<AlertDescription>
					No homeroom sections are assigned to you. Ask an administrator to set you as homeroom
					teacher before marking attendance.
				</AlertDescription>
			</Alert>
		);
	}

	function handleMarkAllPresent() {
		setMarkDraft((current) => {
			const next = { ...current };
			for (const id of rosterIds) next[id] = "present";
			return next;
		});
		setMessage("Marked entire roster as present");
	}

	function handleMarkUnmarkedAbsent() {
		setMarkDraft((current) => {
			const next = { ...current };
			for (const id of rosterIds) {
				if ((next[id] ?? "unknown") === "unknown") next[id] = "absent";
			}
			return next;
		});
		setMessage("Unmarked students flagged absent for follow-up");
	}

	function handleScanDecode(rawValue: string) {
		const code = rawValue.trim().toLowerCase();
		if (!code) return;
		const student = rosterStudents.find(
			(row) => row.studentCode.toLowerCase() === code || row.id === code,
		);
		if (!student) {
			scanFeedback.error();
			setLastScanResult({
				message: `No match for "${rawValue.trim()}" in this section`,
				tone: "error",
			});
			return;
		}
		const alreadyPresent = markDraft[student.id] === "present";
		setMarkDraft((current) => ({ ...current, [student.id]: "present" }));
		setHighlightStudentId(student.id);
		if (alreadyPresent) {
			scanFeedback.alreadyMarked();
			setLastScanResult({ message: `${student.fullName} already marked present`, tone: "already" });
		} else {
			scanFeedback.success();
			setLastScanResult({ message: `Marked ${student.fullName} present`, tone: "success" });
		}
		window.setTimeout(() => setHighlightStudentId(null), 1200);
	}

	async function handleSaveMarks() {
		if (!sessionId) {
			setError("Load a session first");
			return;
		}
		if (!canMarkThisSection) {
			setError("You do not have permission to mark attendance for this section");
			return;
		}
		const marks = rosterIds.map((studentId) => ({
			studentId,
			status: markDraft[studentId] ?? "unknown",
		}));
		if (marks.length === 0) {
			setError("No enrolled students found for this section");
			return;
		}
		setError(null);
		setMessage(null);
		try {
			await markAttendance.mutateAsync({ marks });
			setSavedMarks(Object.fromEntries(rosterIds.map((id) => [id, markDraft[id] ?? "present"])));
			setMessage("Attendance saved · parent alerts will queue when enabled");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save attendance");
		}
	}

	const statusFilterItems: { label: string; value: AttendanceStatusFilter }[] = [
		{ label: `All · ${liveSummary.total}`, value: "all" },
		{ label: `Present · ${liveSummary.present}`, value: "present" },
		{ label: `Late · ${liveSummary.late}`, value: "late" },
		{ label: `Absent · ${liveSummary.absent}`, value: "absent" },
		{ label: `Excused · ${liveSummary.excused}`, value: "excused" },
		{ label: `Unmarked · ${liveSummary.unknown}`, value: "unmarked" },
	];

	return (
		<div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-5 sm:px-6">
			<header className="flex flex-wrap items-end justify-between gap-3 tracking-[-0.15px]">
				<div className="min-w-0">
					<h1 className="font-medium text-[24px] text-dashboard-text-primary leading-8">
						Roll call
					</h1>
					<p className="max-w-2xl text-[14px] text-dashboard-text-dim leading-5">
						{selectedSection
							? formatSectionLabel(
									selectedSection,
									classNameById.get(selectedSection.classId),
									campusNameById.get(selectedSection.campusId),
								)
							: "Pick a class to mark attendance"}{" "}
						· grace window {graceMinutes} min after the bell
					</p>
				</div>
				{sessionLoaded && canMarkThisSection && rosterStudents.length > 0 ? (
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							className="h-7 rounded-full"
							onClick={() => setScanMode(!scanMode)}
						>
							<HugeiconsIcon icon={QrCodeIcon} data-icon="inline-start" strokeWidth={1.8} />
							{scanMode ? "Close scanner" : "Open scanner"}
						</Button>
						<Button
							type="button"
							size="sm"
							className="h-7 rounded-full"
							onClick={() => void handleSaveMarks()}
							disabled={markAttendance.isPending}
						>
							{markAttendance.isPending ? (
								<Spinner className="size-4" />
							) : (
								<HugeiconsIcon icon={Tick02Icon} data-icon="inline-start" strokeWidth={1.8} />
							)}
							Save roll call
						</Button>
					</div>
				) : null}
			</header>

			{error ? (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			{message ? (
				<Alert>
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			) : null}

			<div className="overflow-hidden rounded-[12px] border border-dashboard-border bg-dashboard-surface">
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void loadSessionForSelection();
					}}
					className="flex flex-wrap items-center gap-2 border-dashboard-border border-b px-3 py-2.5 text-[13px]"
				>
					<FilterPill label="Class">
						<SelectField
							id="attendance-section"
							aria-label="Class"
							value={sectionId}
							onValueChange={setSectionId}
							nullable
							placeholder={isTeacherScoped ? "Your homeroom" : "Select"}
							items={sectionSelectItems}
							className={PILL_CONTROL}
						/>
					</FilterPill>
					<FilterPill label="Date">
						<DatePicker
							id="attendance-date"
							value={sessionDate}
							onValueChange={setSessionDate}
							className={PILL_CONTROL}
						/>
					</FilterPill>
					{sessionLoaded ? (
						<FilterPill label="Status">
							<SelectField
								aria-label="Status filter"
								value={statusFilter}
								onValueChange={(value) => setStatusFilter(value as AttendanceStatusFilter)}
								items={statusFilterItems}
								className={PILL_CONTROL}
							/>
						</FilterPill>
					) : null}
					<Button
						type="submit"
						size="sm"
						variant="ghost"
						className="h-7 rounded-full text-dashboard-text-dim"
						disabled={loadSession.isPending || !sectionId}
					>
						{loadSession.isPending ? <Spinner className="size-4" /> : "Reload"}
					</Button>
					{sessionLoaded && rosterStudents.length > 0 ? (
						<div className="ms-auto flex flex-wrap items-center gap-2">
							<SearchInput
								className="h-7 w-full rounded-full sm:w-[200px]"
								value={search}
								onValueChange={setSearch}
								placeholder="Search students"
								aria-label="Search roster"
							/>
							{canMarkThisSection ? (
								<>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="h-7 rounded-full"
										onClick={handleMarkAllPresent}
									>
										All present
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="h-7 rounded-full"
										onClick={handleMarkUnmarkedAbsent}
									>
										Unmarked → absent
									</Button>
								</>
							) : null}
						</div>
					) : null}
				</form>

				<AnimatePresence initial={false}>
					{sessionLoaded && scanMode && canMarkThisSection ? (
						<motion.div
							key="scanner-panel"
							initial={false}
							animate={reduce ? undefined : { opacity: 1, height: "auto" }}
							exit={
								reduce
									? undefined
									: { opacity: 0, height: 0, transition: { duration: 0.2, ease: EASE_OUT } }
							}
							className="overflow-hidden border-dashboard-border border-b"
						>
							<div className="p-4">
								<AttendanceScannerPanel
									onDecode={handleScanDecode}
									lastResult={lastScanResult}
									markedCount={liveSummary.present + liveSummary.late}
									totalCount={rosterIds.length}
								/>
							</div>
						</motion.div>
					) : null}
				</AnimatePresence>

				{sessionLoaded ? (
					<div
						className={cn(
							"relative min-h-[220px] transition-opacity duration-200",
							isSwitchingSession && "opacity-50",
						)}
						aria-busy={isSwitchingSession}
					>
						{isSwitchingSession ? (
							<div className="absolute inset-0 z-10 flex items-center justify-center" aria-hidden>
								<Spinner className="size-5 text-dashboard-text-dim" />
							</div>
						) : null}
						{rosterStudents.length === 0 ? (
							isSwitchingSession ? null : (
								<p className="py-10 text-center text-[13px] text-dashboard-text-dim">
									No active enrollments in this section.
								</p>
							)
						) : (
							<AttendanceRollCallTable
								roster={filteredRoster}
								rollNumbers={rollNumbers}
								markDraft={markDraft}
								highlightStudentId={highlightStudentId}
								canMark={canMarkThisSection}
								onStatusChange={(studentId, status) =>
									setMarkDraft((current) => ({ ...current, [studentId]: status }))
								}
							/>
						)}
					</div>
				) : (
					<div className="flex flex-col items-center gap-1 px-4 py-14 text-center">
						<HugeiconsIcon
							icon={selectableSections.length === 0 ? Calendar03Icon : ClipboardIcon}
							size={20}
							strokeWidth={1.8}
							className="mb-2 text-dashboard-text-dim"
						/>
						<p className="font-medium text-[14px] text-dashboard-text-primary">
							{selectableSections.length === 0 ? "No sections available" : "Pick a class to start"}
						</p>
						<p className="max-w-md text-[13px] text-dashboard-text-dim">
							{selectableSections.length === 0
								? "Once an administrator creates classes and sections, you can mark attendance here."
								: "Choose a class and date above; the roster loads with smart defaults so you can mark everyone in under two minutes."}
						</p>
					</div>
				)}

				{sessionLoaded && rosterStudents.length > 0 ? (
					<div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-dashboard-border border-t px-4 py-2.5 text-[13px] text-dashboard-text-dim tracking-[-0.15px]">
						<span>
							<span className="text-dashboard-text-primary">{filteredRoster.length}</span> of{" "}
							{rosterStudents.length} students shown
						</span>
						<span>
							Present <span className="text-dashboard-text-primary">{liveSummary.present}</span>
						</span>
						<span>
							Late <span className="text-[var(--rx-warning)]">{liveSummary.late}</span>
						</span>
						<span>
							Absent <span className="text-[var(--rx-danger)]">{liveSummary.absent}</span>
						</span>
						<span>
							Unmarked <span className="text-dashboard-text-primary">{liveSummary.unknown}</span>
						</span>
						{canMarkThisSection ? (
							<div className="ms-auto flex items-center gap-3">
								{unsavedCount > 0 ? (
									<span className="text-[var(--rx-warning)]">{unsavedCount} unsaved</span>
								) : (
									<span>All changes saved</span>
								)}
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="h-7 rounded-full"
									onClick={() => void handleConfirmAllPresentSave()}
									disabled={confirmAllPresent.isPending}
								>
									{confirmAllPresent.isPending ? (
										<Spinner className="size-4" />
									) : (
										"Confirm all present"
									)}
								</Button>
							</div>
						) : null}
					</div>
				) : null}
			</div>
		</div>
	);
}
