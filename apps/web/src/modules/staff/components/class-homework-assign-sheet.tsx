"use client";

import { SparklesIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
import { useEffect, useMemo, useState } from "react";
import { AssignTargetPanel } from "@/modules/academics/components/assign-target-panel";
import { useSectionSubjectOptions } from "@/modules/academics/hooks/use-section-subject-options";
import { aiService } from "@/modules/ai/ai.service";
import { useAuth } from "@/modules/auth/context/auth-context";
import { useCreateHomeworkMutation } from "@/modules/homework/hooks/use-homework-queries";
import type { AssignMode, HomeworkStatus } from "@/modules/homework/types/homework.types";

const toneOptions = [
	{ label: "Standard", value: "standard" },
	{ label: "Challenge", value: "challenge" },
	{ label: "Support", value: "support" },
];

const statusOptions = [
	{ label: "Draft", value: "draft" },
	{ label: "Published", value: "published" },
];

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tenantId: string;
	campusId: string | null;
	sectionId: string;
	sectionSubjectId?: string | null;
	classLabel: string;
	subjectName?: string | null;
};

export function ClassHomeworkAssignSheet({
	open,
	onOpenChange,
	tenantId,
	campusId,
	sectionId,
	sectionSubjectId: initialSectionSubjectId,
	classLabel,
	subjectName,
}: Props) {
	const router = useRouter();
	const { token } = useAuth();
	const { options: allSectionSubjects, isLoading: sectionSubjectsLoading } =
		useSectionSubjectOptions(tenantId, campusId);
	const createMutation = useCreateHomeworkMutation(tenantId);

	const sectionSubjectOptions = useMemo(
		() => allSectionSubjects.filter((option) => option.sectionId === sectionId),
		[allSectionSubjects, sectionId],
	);

	const [sectionSubjectId, setSectionSubjectId] = useState(initialSectionSubjectId ?? "");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [materials, setMaterials] = useState("");
	const [dueAt, setDueAt] = useState("");
	const [estimatedMinutes, setEstimatedMinutes] = useState("");
	const [status, setStatus] = useState<HomeworkStatus>("published");
	const [assignMode, setAssignMode] = useState<AssignMode>("whole_class");
	const [studentIds, setStudentIds] = useState<string[]>([]);
	const [aiTopic, setAiTopic] = useState("");
	const [aiTone, setAiTone] = useState<"standard" | "challenge" | "support">("standard");
	const [aiBusy, setAiBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selectedSectionSubject = useMemo(
		() => sectionSubjectOptions.find((option) => option.value === sectionSubjectId),
		[sectionSubjectOptions, sectionSubjectId],
	);

	useEffect(() => {
		if (!open) return;
		setError(null);
		setTitle("");
		setDescription("");
		setMaterials("");
		setDueAt("");
		setEstimatedMinutes("");
		setStatus("published");
		setAssignMode("whole_class");
		setStudentIds([]);
		setAiTopic("");
		const nextSubjectId =
			initialSectionSubjectId ??
			sectionSubjectOptions.find((option) => option.sectionId === sectionId)?.value ??
			"";
		setSectionSubjectId(nextSubjectId);
	}, [open, initialSectionSubjectId, sectionId, sectionSubjectOptions]);

	async function handleAiDraft() {
		if (!token || !aiTopic.trim()) return;
		setAiBusy(true);
		setError(null);
		try {
			const draft = await aiService.draftAcademics(token, tenantId, {
				kind: "homework",
				topic: aiTopic.trim(),
				subjectName: selectedSectionSubject?.subjectName ?? subjectName ?? undefined,
				sectionName: selectedSectionSubject?.sectionName ?? classLabel,
				durationMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
				tone: aiTone,
			});
			setTitle(draft.title);
			setDescription(draft.description);
			if (draft.materials) setMaterials(draft.materials);
		} catch (draftError) {
			setError(draftError instanceof Error ? draftError.message : "AI draft failed");
		} finally {
			setAiBusy(false);
		}
	}

	async function handleSubmit() {
		setError(null);
		if (!sectionSubjectId) {
			setError("Select a subject for this class");
			return;
		}
		if (!title.trim()) {
			setError("Add a title or generate a draft with AI");
			return;
		}
		if (assignMode === "selected_students" && studentIds.length === 0) {
			setError("Select at least one student");
			return;
		}

		try {
			const dueAtIso = dueAt ? new Date(dueAt).toISOString() : undefined;
			const minutes = estimatedMinutes ? Number(estimatedMinutes) : undefined;
			const response = await createMutation.mutateAsync({
				sectionSubjectId,
				title: title.trim(),
				description: description.trim() || undefined,
				materials: materials.trim() || undefined,
				dueAt: dueAtIso,
				status,
				assignMode,
				studentIds: assignMode === "selected_students" ? studentIds : undefined,
				estimatedMinutes: minutes,
			});
			onOpenChange(false);
			router.push(`/admin/homework/${response.assignment.id}`);
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Could not save homework");
		}
	}

	const subjectLocked = Boolean(initialSectionSubjectId);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>Assign homework</SheetTitle>
					<SheetDescription>
						{classLabel}
						{subjectName ? ` · ${subjectName}` : ""} — draft with AI, then publish in one flow.
					</SheetDescription>
				</SheetHeader>

				<FieldGroup className="space-y-4 px-4 py-4">
					{sectionSubjectOptions.length > 1 || !subjectLocked ? (
						<Field>
							<FieldLabel>Class & subject</FieldLabel>
							<SelectField
								items={sectionSubjectOptions.map((option) => ({
									label: option.label,
									value: option.value,
								}))}
								value={sectionSubjectId}
								onValueChange={setSectionSubjectId}
								placeholder={sectionSubjectsLoading ? "Loading…" : "Select subject"}
								disabled={sectionSubjectsLoading || subjectLocked}
							/>
						</Field>
					) : null}

					<div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
						<div className="mb-3 flex items-center gap-2">
							<HugeiconsIcon icon={SparklesIcon} size={18} className="text-primary" />
							<p className="font-medium text-[13px]">Draft with AI</p>
						</div>
						<div className="grid gap-3">
							<Input
								placeholder="Topic, e.g. revision for tomorrow's quiz"
								value={aiTopic}
								onChange={(event) => setAiTopic(event.target.value)}
							/>
							<SelectField
								items={toneOptions}
								value={aiTone}
								onValueChange={(value) => setAiTone(value as typeof aiTone)}
							/>
							<Button
								type="button"
								variant="secondary"
								onClick={() => void handleAiDraft()}
								disabled={aiBusy || !aiTopic.trim()}
							>
								{aiBusy ? "Drafting…" : "Generate draft"}
							</Button>
						</div>
					</div>

					<Field>
						<FieldLabel>Title</FieldLabel>
						<Input value={title} onChange={(event) => setTitle(event.target.value)} />
					</Field>
					<Field>
						<FieldLabel>Instructions</FieldLabel>
						<Textarea
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							rows={5}
						/>
					</Field>
					<Field>
						<FieldLabel>Materials</FieldLabel>
						<Textarea
							value={materials}
							onChange={(event) => setMaterials(event.target.value)}
							rows={2}
						/>
					</Field>
					<div className="grid gap-3 sm:grid-cols-2">
						<Field>
							<FieldLabel>Due date</FieldLabel>
							<Input
								type="datetime-local"
								value={dueAt}
								onChange={(event) => setDueAt(event.target.value)}
							/>
						</Field>
						<Field>
							<FieldLabel>Est. minutes</FieldLabel>
							<Input
								type="number"
								min={1}
								value={estimatedMinutes}
								onChange={(event) => setEstimatedMinutes(event.target.value)}
							/>
						</Field>
					</div>

					<AssignTargetPanel
						tenantId={tenantId}
						campusId={campusId}
						sectionId={sectionId}
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
							onValueChange={(value) => setStatus(value as HomeworkStatus)}
						/>
					</Field>

					{error ? (
						<Alert variant="destructive">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					) : null}
				</FieldGroup>

				<SheetFooter className="border-t px-4 py-3">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={() => void handleSubmit()} disabled={createMutation.isPending}>
						{createMutation.isPending ? "Saving…" : "Create assignment"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
