"use client";

import { ImageUpload01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { Checkbox } from "@school-os/ui/components/checkbox";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@school-os/ui/components/drawer";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useInviteMemberMutation } from "@/modules/members/hooks/use-member-queries";
import {
	useCreateStudentMutation,
	useUploadStudentPhotoMutation,
} from "../hooks/use-student-queries";

export type AdmitFormState = {
	studentCode: string;
	firstName: string;
	lastName: string;
	dateOfBirth: string;
	gender: string;
	email: string;
	phone: string;
	addressLine1: string;
	city: string;
	emergencyContactName: string;
	emergencyContactPhone: string;
	previousSchool: string;
	guardianFirstName: string;
	guardianLastName: string;
	guardianPhone: string;
	guardianEmail: string;
	guardianRelationship: string;
};

export const emptyAdmitForm: AdmitFormState = {
	studentCode: "",
	firstName: "",
	lastName: "",
	dateOfBirth: "",
	gender: "",
	email: "",
	phone: "",
	addressLine1: "",
	city: "",
	emergencyContactName: "",
	emergencyContactPhone: "",
	previousSchool: "",
	guardianFirstName: "",
	guardianLastName: "",
	guardianPhone: "",
	guardianEmail: "",
	guardianRelationship: "father",
};

const STEPS = ["Student", "Photo", "Family", "Review"] as const;

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	tenantId: string;
	campusId: string | null;
	canWrite: boolean;
	canInviteParent: boolean;
	onAdmitted: (message: string) => void;
	onError: (message: string) => void;
};

export function AdmitStudentWizard({
	open,
	onOpenChange,
	tenantId,
	campusId,
	canWrite,
	canInviteParent,
	onAdmitted,
	onError,
}: Props) {
	const [step, setStep] = useState(0);
	const [form, setForm] = useState<AdmitFormState>(emptyAdmitForm);
	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const [sendParentInvite, setSendParentInvite] = useState(true);
	const [busy, setBusy] = useState(false);

	const createStudent = useCreateStudentMutation(tenantId, campusId);
	const uploadPhoto = useUploadStudentPhotoMutation(tenantId);
	const inviteMember = useInviteMemberMutation(tenantId);

	useEffect(() => {
		if (!photoFile) {
			setPhotoPreview((prev) => {
				if (prev) URL.revokeObjectURL(prev);
				return null;
			});
			return;
		}
		const url = URL.createObjectURL(photoFile);
		setPhotoPreview((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return url;
		});
		return () => URL.revokeObjectURL(url);
	}, [photoFile]);

	useEffect(() => {
		if (!open) {
			setStep(0);
			setForm(emptyAdmitForm);
			setPhotoFile(null);
			setSendParentInvite(true);
		}
	}, [open]);

	const canNextFromStudent = useMemo(
		() =>
			Boolean(campusId && form.studentCode.trim() && form.firstName.trim() && form.lastName.trim()),
		[campusId, form.firstName, form.lastName, form.studentCode],
	);

	const parentInviteEmail = (form.guardianEmail || form.email).trim();

	async function handleSubmit() {
		if (!campusId || !canWrite) return;
		setBusy(true);
		try {
			const result = await createStudent.mutateAsync({
				campusId,
				studentCode: form.studentCode,
				firstName: form.firstName,
				lastName: form.lastName,
				dateOfBirth: form.dateOfBirth || undefined,
				gender: form.gender
					? (form.gender as "male" | "female" | "other" | "prefer_not_to_say")
					: undefined,
				email: form.email || undefined,
				phone: form.phone || undefined,
				addressLine1: form.addressLine1 || undefined,
				city: form.city || undefined,
				emergencyContactName: form.emergencyContactName || undefined,
				emergencyContactPhone: form.emergencyContactPhone || undefined,
				previousSchool: form.previousSchool || undefined,
				admittedOn: new Date().toISOString().slice(0, 10),
				guardians:
					form.guardianFirstName && form.guardianLastName
						? [
								{
									firstName: form.guardianFirstName,
									lastName: form.guardianLastName,
									email: form.guardianEmail || undefined,
									phone: form.guardianPhone || undefined,
									relationship: form.guardianRelationship as
										| "father"
										| "mother"
										| "guardian"
										| "step_parent"
										| "grandparent"
										| "sibling"
										| "other",
									isPrimary: true,
								},
							]
						: undefined,
			});

			if (photoFile) {
				await uploadPhoto.mutateAsync({ studentId: result.student.id, file: photoFile });
			}

			let inviteNote = "";
			if (canInviteParent && sendParentInvite && parentInviteEmail.includes("@")) {
				try {
					await inviteMember.mutateAsync({
						email: parentInviteEmail,
						role: "parent",
						campusId: campusId ?? undefined,
					});
					inviteNote = ` Parent invite sent to ${parentInviteEmail}.`;
				} catch {
					inviteNote = " Student saved; parent invite could not be sent.";
				}
			}

			onOpenChange(false);
			onAdmitted(`Student ${result.student.fullName} admitted.${inviteNote}`);
		} catch (err) {
			onError(err instanceof Error ? err.message : "Could not complete admission");
		} finally {
			setBusy(false);
		}
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="flex h-full max-h-none flex-col data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-md">
				<DrawerHeader className="border-border border-b text-start">
					<DrawerTitle>Admit student</DrawerTitle>
					<DrawerDescription>
						Step {step + 1} of {STEPS.length} — {STEPS[step]}
					</DrawerDescription>
					<div className="mt-3 flex gap-1">
						{STEPS.map((label, idx) => (
							<div
								key={label}
								className={cn(
									"h-1 flex-1 rounded-full transition-colors",
									idx <= step ? "bg-primary" : "bg-muted",
								)}
								aria-hidden
							/>
						))}
					</div>
				</DrawerHeader>

				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
					{step === 0 ? <AdmitStudentFields value={form} onChange={setForm} /> : null}
					{step === 1 ? (
						<div className="space-y-4">
							<p className="text-muted-foreground text-sm">
								Add a portrait for ID cards and the roster. JPEG, PNG, or WebP up to 2 MB.
							</p>
							<label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 transition-colors hover:bg-muted/40">
								{photoPreview?.startsWith("blob:") ? (
									// Only an object URL from URL.createObjectURL is rendered, never file text.
									// oxlint-disable-next-line nextjs/no-img-element -- blob preview before upload
									<img
										src={photoPreview}
										alt="Preview of the selected portrait"
										className="size-28 rounded-2xl object-cover ring-1 ring-border"
									/>
								) : (
									<span className="flex size-28 items-center justify-center rounded-2xl bg-muted text-muted-foreground ring-1 ring-border">
										<HugeiconsIcon icon={ImageUpload01Icon} size={32} strokeWidth={1.6} />
									</span>
								)}
								<span className="font-medium text-sm">
									{photoFile ? photoFile.name : "Choose photo (optional)"}
								</span>
								<input
									type="file"
									accept="image/jpeg,image/png,image/webp"
									className="sr-only"
									onChange={(event) => {
										const file = event.target.files?.[0] ?? null;
										setPhotoFile(file);
									}}
								/>
							</label>
							{photoFile ? (
								<Button type="button" variant="ghost" size="sm" onClick={() => setPhotoFile(null)}>
									Remove photo
								</Button>
							) : null}
						</div>
					) : null}
					{step === 2 ? (
						<FieldGroup className="grid gap-4">
							<p className="text-muted-foreground text-sm">
								Primary guardian for pickup and alerts. Optionally invite them to the parent app.
							</p>
							<div className="grid gap-4 sm:grid-cols-2">
								<Field>
									<FieldLabel>Guardian first name</FieldLabel>
									<Input
										value={form.guardianFirstName}
										onChange={(event) =>
											setForm({ ...form, guardianFirstName: event.target.value })
										}
									/>
								</Field>
								<Field>
									<FieldLabel>Guardian last name</FieldLabel>
									<Input
										value={form.guardianLastName}
										onChange={(event) => setForm({ ...form, guardianLastName: event.target.value })}
									/>
								</Field>
							</div>
							<Field>
								<FieldLabel>Relationship</FieldLabel>
								<SelectField
									value={form.guardianRelationship}
									onValueChange={(guardianRelationship) =>
										setForm({ ...form, guardianRelationship })
									}
									items={[
										{ label: "Father", value: "father" },
										{ label: "Mother", value: "mother" },
										{ label: "Guardian", value: "guardian" },
										{ label: "Grandparent", value: "grandparent" },
										{ label: "Other", value: "other" },
									]}
								/>
							</Field>
							<div className="grid gap-4 sm:grid-cols-2">
								<Field>
									<FieldLabel>Guardian phone</FieldLabel>
									<Input
										value={form.guardianPhone}
										onChange={(event) => setForm({ ...form, guardianPhone: event.target.value })}
									/>
								</Field>
								<Field>
									<FieldLabel>Guardian email</FieldLabel>
									<Input
										type="email"
										value={form.guardianEmail}
										onChange={(event) => setForm({ ...form, guardianEmail: event.target.value })}
										placeholder="For parent portal invite"
									/>
								</Field>
							</div>
							{canInviteParent ? (
								<div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
									<Checkbox
										id="admit-send-parent-invite"
										checked={sendParentInvite}
										onCheckedChange={(checked) => setSendParentInvite(checked === true)}
									/>
									<label
										htmlFor="admit-send-parent-invite"
										className="cursor-pointer text-sm leading-snug"
									>
										Send parent portal invite
										{parentInviteEmail ? (
											<span className="block text-muted-foreground text-xs">
												to {parentInviteEmail}
											</span>
										) : (
											<span className="block text-muted-foreground text-xs">
												Add guardian or student email on step 1
											</span>
										)}
									</label>
								</div>
							) : null}
						</FieldGroup>
					) : null}
					{step === 3 ? (
						<dl className="space-y-3 text-sm">
							<ReviewRow label="Name" value={`${form.firstName} ${form.lastName}`.trim()} />
							<ReviewRow label="Admission #" value={form.studentCode} />
							<ReviewRow label="Photo" value={photoFile ? photoFile.name : "None"} />
							<ReviewRow
								label="Guardian"
								value={
									form.guardianFirstName
										? `${form.guardianFirstName} ${form.guardianLastName}`
										: "None"
								}
							/>
							<ReviewRow
								label="Parent invite"
								value={
									canInviteParent && sendParentInvite && parentInviteEmail
										? parentInviteEmail
										: "Skipped"
								}
							/>
						</dl>
					) : null}
				</div>

				<DrawerFooter className="border-border border-t">
					<div className="flex w-full flex-wrap items-center justify-between gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={step === 0 || busy}
							onClick={() => setStep((s) => Math.max(0, s - 1))}
						>
							Back
						</Button>
						<div className="flex gap-2">
							<DrawerClose asChild>
								<Button type="button" variant="ghost">
									Cancel
								</Button>
							</DrawerClose>
							{step < STEPS.length - 1 ? (
								<Button
									type="button"
									disabled={step === 0 && !canNextFromStudent}
									onClick={() => setStep((s) => s + 1)}
								>
									Continue
								</Button>
							) : (
								<Button
									type="button"
									disabled={!canNextFromStudent || busy}
									onClick={() => void handleSubmit()}
								>
									{busy ? <Spinner className="size-4" /> : "Admit student"}
								</Button>
							)}
						</div>
					</div>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

function ReviewRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4 border-border border-b pb-2 last:border-0">
			<dt className="text-muted-foreground">{label}</dt>
			<dd className="text-end font-medium">{value || "—"}</dd>
		</div>
	);
}

function AdmitStudentFields({
	value,
	onChange,
}: {
	value: AdmitFormState;
	onChange: (next: AdmitFormState) => void;
}) {
	return (
		<FieldGroup className="grid gap-4">
			<Field>
				<FieldLabel>Admission number</FieldLabel>
				<Input
					value={value.studentCode}
					onChange={(event) => onChange({ ...value, studentCode: event.target.value })}
					placeholder="AKES-2026-001"
					required
				/>
			</Field>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel>First name</FieldLabel>
					<Input
						value={value.firstName}
						onChange={(event) => onChange({ ...value, firstName: event.target.value })}
						required
					/>
				</Field>
				<Field>
					<FieldLabel>Last name</FieldLabel>
					<Input
						value={value.lastName}
						onChange={(event) => onChange({ ...value, lastName: event.target.value })}
						required
					/>
				</Field>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel>Date of birth</FieldLabel>
					<Input
						type="date"
						value={value.dateOfBirth}
						onChange={(event) => onChange({ ...value, dateOfBirth: event.target.value })}
					/>
				</Field>
				<Field>
					<FieldLabel>Gender</FieldLabel>
					<SelectField
						value={value.gender}
						onValueChange={(gender) => onChange({ ...value, gender })}
						nullable
						placeholder="Select gender"
						items={[
							{ label: "Male", value: "male" },
							{ label: "Female", value: "female" },
							{ label: "Other", value: "other" },
							{ label: "Prefer not to say", value: "prefer_not_to_say" },
						]}
					/>
				</Field>
			</div>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel>Student email</FieldLabel>
					<Input
						type="email"
						value={value.email}
						onChange={(event) => onChange({ ...value, email: event.target.value })}
					/>
				</Field>
				<Field>
					<FieldLabel>Phone</FieldLabel>
					<Input
						value={value.phone}
						onChange={(event) => onChange({ ...value, phone: event.target.value })}
					/>
				</Field>
			</div>
			<Field>
				<FieldLabel>Address</FieldLabel>
				<Input
					value={value.addressLine1}
					onChange={(event) => onChange({ ...value, addressLine1: event.target.value })}
				/>
			</Field>
			<Field>
				<FieldLabel>City</FieldLabel>
				<Input
					value={value.city}
					onChange={(event) => onChange({ ...value, city: event.target.value })}
				/>
			</Field>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field>
					<FieldLabel>Emergency contact</FieldLabel>
					<Input
						value={value.emergencyContactName}
						onChange={(event) => onChange({ ...value, emergencyContactName: event.target.value })}
					/>
				</Field>
				<Field>
					<FieldLabel>Emergency phone</FieldLabel>
					<Input
						value={value.emergencyContactPhone}
						onChange={(event) => onChange({ ...value, emergencyContactPhone: event.target.value })}
					/>
				</Field>
			</div>
			<Field>
				<FieldLabel>Previous school</FieldLabel>
				<Input
					value={value.previousSchool}
					onChange={(event) => onChange({ ...value, previousSchool: event.target.value })}
				/>
			</Field>
		</FieldGroup>
	);
}
