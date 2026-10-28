"use client";

import { Alert, AlertDescription } from "@school-os/ui/components/alert";
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
import { Textarea } from "@school-os/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AssignTargetPanel } from "@/modules/academics/components/assign-target-panel";
import { useSectionSubjectOptions } from "@/modules/academics/hooks/use-section-subject-options";
import { useCreateAssessmentMutation } from "@/modules/assessments/hooks/use-assessments-queries";
import type {
	AssessmentStatus,
	AssessmentType,
	AssignMode,
} from "@/modules/assessments/types/assessments.types";

const statusOptions = [
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
	{ label: "Closed", value: "closed" },
];

const typeOptions = [
	{ label: "Quiz", value: "quiz" },
	{ label: "Test", value: "test" },
	{ label: "Exam", value: "exam" },
];

const today = () => new Date().toLocaleDateString("en-CA");

/** New test, quiz or exam: class subject, schedule, who sits it, then on to entering marks. */
export function AssessmentCreateSheet({
	tenantId,
	campusId,
	open,
	defaultType,
	onOpenChange,
}: {
	tenantId: string | null;
	campusId: string | null;
	open: boolean;
	defaultType: AssessmentType;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const { options: sectionSubjectOptions, isLoading: sectionSubjectsLoading } =
		useSectionSubjectOptions(tenantId, campusId);
	const createMutation = useCreateAssessmentMutation(tenantId ?? "");

	const [title, setTitle] = useState("");
	const [assessedOn, setAssessedOn] = useState(today);
	const [startsAt, setStartsAt] = useState("");
	const [durationMinutes, setDurationMinutes] = useState("45");
	const [room, setRoom] = useState("");
	const [instructions, setInstructions] = useState("");
	const [maxScore, setMaxScore] = useState("100");
	const [type, setType] = useState<AssessmentType>(defaultType);
	const [status, setStatus] = useState<AssessmentStatus>("draft");
	const [pickedSectionSubjectId, setSectionSubjectId] = useState("");
	const [assignMode, setAssignMode] = useState<AssignMode>("whole_class");
	const [studentIds, setStudentIds] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);

	const sectionSubjectId = pickedSectionSubjectId || sectionSubjectOptions[0]?.value || "";
	const selectedSectionSubject = sectionSubjectOptions.find(
		(option) => option.value === sectionSubjectId,
	);

	function reset() {
		setTitle("");
		setAssessedOn(today());
		setStartsAt("");
		setDurationMinutes("45");
		setRoom("");
		setInstructions("");
		setMaxScore("100");
		setType(defaultType);
		setStatus("draft");
		setSectionSubjectId("");
		setAssignMode("whole_class");
		setStudentIds([]);
		setError(null);
	}

	async function handleCreate() {
		if (!tenantId) return;
		setError(null);
		if (!sectionSubjectId) {
			setError("Select a class and subject");
			return;
		}
		if (assignMode === "selected_students" && studentIds.length === 0) {
			setError("Select at least one student");
			return;
		}

		try {
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
			onOpenChange(false);
			reset();
			router.push(`/admin/assessments/${response.assessment.id}`);
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Could not create assessment");
		}
	}

	return (
		<Sheet
			open={open}
			onOpenChange={(next) => {
				if (next) reset();
				onOpenChange(next);
			}}
		>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>
						New {type === "quiz" ? "quiz" : type === "exam" ? "exam" : "test"}
					</SheetTitle>
					<SheetDescription>
						Schedule it and assign it to the whole class or selected students.
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
							items={statusOptions}
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
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={createMutation.isPending || !title.trim()}>
						Create & enter marks
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
