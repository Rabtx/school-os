"use client";

import { File02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@school-os/ui/components/sheet";
import { Spinner } from "@school-os/ui/components/spinner";
import { Textarea } from "@school-os/ui/components/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { DataTable, type DataTableColumn } from "@/components/data-table/data-table";
import { AssignTargetPanel } from "@/modules/academics/components/assign-target-panel";
import { useSectionSubjectOptions } from "@/modules/academics/hooks/use-section-subject-options";
import {
	useAssessmentsListQuery,
	useCreateAssessmentMutation,
} from "@/modules/assessments/hooks/use-assessments-queries";
import type {
	Assessment,
	AssessmentStatus,
	AssessmentType,
	AssignMode,
} from "@/modules/assessments/types/assessments.types";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import { NoAccess } from "@/components/states";

const statusOptions = [
	{ label: "All statuses", value: "all" },
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
	{ label: "Closed", value: "closed" },
];

const typeOptions = [
	{ label: "Quiz", value: "quiz" },
	{ label: "Test", value: "test" },
	{ label: "Exam", value: "exam" },
];

export function AssessmentsPage() {
	const router = useRouter();
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can, isLoading: permissionsLoading } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canRead = can(PermissionCodes.ASSESSMENTS_READ);
	const canWrite = can(PermissionCodes.ASSESSMENTS_WRITE);

	const [sectionSubjectFilter, setSectionSubjectFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [sheetOpen, setSheetOpen] = useState(false);
	const [title, setTitle] = useState("");
	const [assessedOn, setAssessedOn] = useState(() => new Date().toLocaleDateString("en-CA"));
	const [startsAt, setStartsAt] = useState("");
	const [durationMinutes, setDurationMinutes] = useState("45");
	const [room, setRoom] = useState("");
	const [instructions, setInstructions] = useState("");
	const [maxScore, setMaxScore] = useState("100");
	const [type, setType] = useState<AssessmentType>("test");
	const [status, setStatus] = useState<AssessmentStatus>("draft");
	const [sectionSubjectId, setSectionSubjectId] = useState("");
	const [assignMode, setAssignMode] = useState<AssignMode>("whole_class");
	const [studentIds, setStudentIds] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);

	const { options: sectionSubjectOptions, isLoading: sectionSubjectsLoading } =
		useSectionSubjectOptions(tenantId, campusId);
	const selectedSectionSubject = sectionSubjectOptions.find(
		(option) => option.value === sectionSubjectId,
	);
	const listQuery = useAssessmentsListQuery(
		tenantId,
		{
			sectionSubjectId: sectionSubjectFilter === "all" ? undefined : sectionSubjectFilter,
			status: statusFilter === "all" ? undefined : statusFilter,
		},
		canRead,
	);
	const createMutation = useCreateAssessmentMutation(tenantId ?? "");

	const rows = listQuery.data ?? [];

	const columns: DataTableColumn<Assessment>[] = [
		{
			id: "title",
			header: "Title",
			renderCell: (row) => (
				<Link href={`/admin/assessments/${row.id}`} className="font-medium hover:underline">
					{row.title}
				</Link>
			),
			sortable: true,
			sortValue: (row) => row.title,
		},
		{
			id: "type",
			header: "Type",
			renderCell: (row) => <Badge variant="outline">{row.type}</Badge>,
			sortable: true,
			sortValue: (row) => row.type,
		},
		{
			id: "class",
			header: "Class",
			renderCell: (row) => `${row.sectionName} · ${row.subjectName}`,
			sortable: true,
			sortValue: (row) => `${row.sectionName} ${row.subjectName}`,
		},
		{
			id: "assessedOn",
			header: "Date",
			renderCell: (row) => row.assessedOn,
			sortable: true,
			sortValue: (row) => row.assessedOn,
		},
		{
			id: "maxScore",
			header: "Max score",
			renderCell: (row) => row.maxScore,
			sortable: true,
			sortValue: (row) => row.maxScore,
		},
		{
			id: "status",
			header: "Status",
			renderCell: (row) => (
				<Badge variant={row.status === "published" ? "default" : "outline"}>{row.status}</Badge>
			),
			sortable: true,
			sortValue: (row) => row.status,
		},
	];

	function resetForm() {
		setTitle("");
		setAssessedOn(new Date().toLocaleDateString("en-CA"));
		setStartsAt("");
		setDurationMinutes("45");
		setRoom("");
		setInstructions("");
		setMaxScore("100");
		setType("test");
		setStatus("draft");
		setSectionSubjectId(sectionSubjectOptions[0]?.value ?? "");
		setAssignMode("whole_class");
		setStudentIds([]);
		setError(null);
	}

	async function handleCreate() {
		if (!tenantId) return;
		setError(null);

		try {
			if (!sectionSubjectId) {
				setError("Select a class and subject");
				return;
			}
			if (assignMode === "selected_students" && studentIds.length === 0) {
				setError("Select at least one student");
				return;
			}

			const response = await createMutation.mutateAsync({
				sectionSubjectId,
				title,
				assessedOn,
				maxScore: Number(maxScore),
				type,
				status,
				assignMode,
				studentIds: assignMode === "selected_students" ? studentIds : undefined,
				startsAt: startsAt ? new Date(startsAt).toISOString() : null,
				durationMinutes: durationMinutes ? Number(durationMinutes) : null,
				room: room.trim() || null,
				instructions: instructions.trim() || null,
			});

			setSheetOpen(false);
			resetForm();
			router.push(`/admin/assessments/${response.assessment.id}`);
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Could not create assessment");
		}
	}

	if (permissionsLoading) {
		return (
			<AdminPageShell title="Tests & exams" description="Loading your access…">
				<div className="flex min-h-[240px] items-center justify-center">
					<Spinner className="size-6" />
				</div>
			</AdminPageShell>
		);
	}

	if (!canRead) {
		return (
			<NoAccess
				title="Tests and exams are not part of your role"
				description="Ask the principal or an admin if you need access."
			/>
		);
	}

	return (
		<AdminPageShell
			title="Tests & exams"
			description="Create assessments, schedule them on the planner, and enter grades."
			icon={File02Icon}
			maxWidth="7xl"
			loading={listQuery.isLoading}
			actions={
				canWrite ? (
					<div className="flex flex-wrap gap-2">
						<Button
							size="sm"
							variant="outline"
							nativeButton={false}
							render={<Link href="/admin/test-planner" />}
						>
							Test planner
						</Button>
						<Button
							size="sm"
							onClick={() => {
								resetForm();
								setSheetOpen(true);
							}}
						>
							<HugeiconsIcon icon={PlusSignIcon} data-icon="inline-start" strokeWidth={2} />
							New assessment
						</Button>
					</div>
				) : null
			}
		>
			<div className="mb-4 flex flex-wrap gap-3">
				<Field className="min-w-[220px]">
					<FieldLabel>Class & subject</FieldLabel>
					<SelectField
						aria-label="Class and subject filter"
						items={[{ label: "All classes", value: "all" }, ...sectionSubjectOptions]}
						value={sectionSubjectFilter}
						onValueChange={setSectionSubjectFilter}
					/>
				</Field>
				<Field className="min-w-[160px]">
					<FieldLabel>Status</FieldLabel>
					<SelectField
						aria-label="Status filter"
						items={statusOptions}
						value={statusFilter}
						onValueChange={setStatusFilter}
					/>
				</Field>
			</div>

			{listQuery.error ? (
				<Alert variant="destructive" className="mb-4">
					<AlertDescription>
						{listQuery.error instanceof Error
							? listQuery.error.message
							: "Failed to load assessments"}
					</AlertDescription>
				</Alert>
			) : null}

			<DataTable
				columns={columns}
				rows={rows}
				getRowId={(row) => row.id}
				emptyTitle="No assessments yet"
				emptyDescription={canWrite ? "Create your first test or quiz." : "No assessments to show."}
			/>

			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>New assessment</SheetTitle>
						<SheetDescription>
							Schedule a test and assign it to the whole class or selected students.
						</SheetDescription>
					</SheetHeader>

					<FieldGroup className="space-y-4 px-4 py-4">
						<Field>
							<FieldLabel>Class & subject</FieldLabel>
							<SelectField
								items={sectionSubjectOptions}
								value={sectionSubjectId}
								onValueChange={setSectionSubjectId}
								placeholder={sectionSubjectsLoading ? "Loading…" : "Select class"}
								disabled={sectionSubjectsLoading}
							/>
						</Field>
						<Field>
							<FieldLabel>Title</FieldLabel>
							<Input value={title} onChange={(event) => setTitle(event.target.value)} />
						</Field>
						<Field>
							<FieldLabel>Type</FieldLabel>
							<SelectField
								items={typeOptions}
								value={type}
								onValueChange={(value) => setType(value as AssessmentType)}
							/>
						</Field>
						<div className="grid gap-3 sm:grid-cols-2">
							<Field>
								<FieldLabel>Assessment date</FieldLabel>
								<Input
									type="date"
									value={assessedOn}
									onChange={(event) => setAssessedOn(event.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel>Start time</FieldLabel>
								<Input
									type="datetime-local"
									value={startsAt}
									onChange={(event) => setStartsAt(event.target.value)}
								/>
							</Field>
						</div>
						<div className="grid gap-3 sm:grid-cols-2">
							<Field>
								<FieldLabel>Duration (min)</FieldLabel>
								<Input
									type="number"
									min={1}
									value={durationMinutes}
									onChange={(event) => setDurationMinutes(event.target.value)}
								/>
							</Field>
							<Field>
								<FieldLabel>Room</FieldLabel>
								<Input value={room} onChange={(event) => setRoom(event.target.value)} />
							</Field>
						</div>
						<Field>
							<FieldLabel>Instructions for students</FieldLabel>
							<Textarea
								value={instructions}
								onChange={(event) => setInstructions(event.target.value)}
								rows={3}
							/>
						</Field>
						<Field>
							<FieldLabel>Max score</FieldLabel>
							<Input
								type="number"
								min={1}
								value={maxScore}
								onChange={(event) => setMaxScore(event.target.value)}
							/>
						</Field>

						<AssignTargetPanel
							tenantId={tenantId}
							campusId={campusId}
							sectionId={selectedSectionSubject?.sectionId ?? null}
							assignMode={assignMode}
							studentIds={studentIds}
							onAssignModeChange={setAssignMode}
							onStudentIdsChange={setStudentIds}
						/>

						<Field>
							<FieldLabel>Status</FieldLabel>
							<SelectField
								items={statusOptions.filter((option) => option.value !== "all")}
								value={status}
								onValueChange={(value) => setStatus(value as AssessmentStatus)}
							/>
						</Field>
						{error ? (
							<Alert variant="destructive">
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						) : null}
					</FieldGroup>

					<SheetFooter className="border-dashboard-border border-t px-4 py-3">
						<Button variant="outline" onClick={() => setSheetOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleCreate} disabled={createMutation.isPending || !title.trim()}>
							Create & enter grades
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</AdminPageShell>
	);
}
