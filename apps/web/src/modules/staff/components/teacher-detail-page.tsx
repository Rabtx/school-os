"use client";

import { ArrowLeft01Icon, TeacherIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert, AlertDescription } from "@school-os/ui/components/alert";
import { Badge } from "@school-os/ui/components/badge";
import { Button } from "@school-os/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSectionsQuery } from "@/modules/academic/hooks/use-academic-queries";
import { PermissionCodes, usePermissions, useTenantContext } from "@/modules/tenants";
import {
	useAssignSectionSubjectMutation,
	useSubjectsQuery,
	useTeacherQuery,
	useUpsertTeacherProfileMutation,
} from "../hooks/use-staff-queries";
import { NoAccess } from "@/components/states";

type Props = {
	membershipId: string;
};

export function TeacherDetailPage({ membershipId }: Props) {
	const { activeTenant, activeCampus, campuses } = useTenantContext();
	const { can } = usePermissions();
	const tenantId = activeTenant?.id ?? null;
	const campusId = activeCampus?.id ?? campuses[0]?.id ?? null;
	const canRead = can(PermissionCodes.STAFF_READ);
	const canWrite = can(PermissionCodes.STAFF_WRITE);

	const query = useTeacherQuery(tenantId, membershipId, canRead);
	const upsertProfile = useUpsertTeacherProfileMutation(tenantId ?? "", membershipId);
	const sectionsQuery = useSectionsQuery(tenantId, campusId, canWrite);
	const subjectsQuery = useSubjectsQuery(tenantId, canWrite);
	const assignSubject = useAssignSectionSubjectMutation(tenantId ?? "");

	const sectionItems = useMemo(
		() =>
			(sectionsQuery.data ?? []).map((section) => ({
				label: section.name,
				value: section.id,
			})),
		[sectionsQuery.data],
	);
	const subjectItems = useMemo(
		() =>
			(subjectsQuery.data ?? []).map((subject) => ({
				label: `${subject.name} (${subject.code})`,
				value: subject.id,
			})),
		[subjectsQuery.data],
	);

	const [employeeCode, setEmployeeCode] = useState("");
	const [phone, setPhone] = useState("");
	const [qualification, setQualification] = useState("");
	const [specialization, setSpecialization] = useState("");
	const [hireDate, setHireDate] = useState("");
	const [status, setStatus] = useState<"active" | "inactive" | "on_leave">("active");
	const [notes, setNotes] = useState("");
	const [assignSectionId, setAssignSectionId] = useState("");
	const [assignSubjectId, setAssignSubjectId] = useState("");
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const profile = query.data?.teacher.profile;

	useEffect(() => {
		if (!profile) return;
		setEmployeeCode(profile.employeeCode ?? "");
		setPhone(profile.phone ?? "");
		setQualification(profile.qualification ?? "");
		setSpecialization(profile.specialization ?? "");
		setHireDate(profile.hireDate ?? "");
		setStatus(profile.status);
		setNotes(profile.notes ?? "");
	}, [profile]);

	if (!tenantId) {
		return (
			<Alert>
				<AlertDescription>Create an organization first to view teachers.</AlertDescription>
			</Alert>
		);
	}

	if (!canRead) {
		return (
			<NoAccess
				title="Teachers are not part of your role"
				description="Ask the principal or an admin if you need access."
			/>
		);
	}

	if (query.isLoading) {
		return (
			<div className="flex justify-center py-10">
				<Spinner />
			</div>
		);
	}

	if (query.isError || !query.data) {
		return (
			<Alert variant="destructive">
				<AlertDescription>Teacher not found or you lack access.</AlertDescription>
			</Alert>
		);
	}

	const { teacher, homeroomSections, subjectAssignments } = query.data;

	async function handleSave(event: React.FormEvent) {
		event.preventDefault();
		if (!canWrite) return;
		setError(null);
		setMessage(null);
		try {
			await upsertProfile.mutateAsync({
				employeeCode: employeeCode || undefined,
				phone: phone || undefined,
				qualification: qualification || undefined,
				specialization: specialization || undefined,
				hireDate: hireDate || undefined,
				status,
				notes: notes || undefined,
			});
			setMessage("Teacher profile saved");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save profile");
		}
	}

	async function handleAssignSubject(event: React.FormEvent) {
		event.preventDefault();
		if (!canWrite || !assignSectionId || !assignSubjectId) return;
		setError(null);
		setMessage(null);
		try {
			await assignSubject.mutateAsync({
				sectionId: assignSectionId,
				subjectId: assignSubjectId,
				teacherMembershipId: membershipId,
			});
			setAssignSectionId("");
			setAssignSubjectId("");
			setMessage("Subject assignment added");
			await query.refetch();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not assign subject");
		}
	}

	return (
		<div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
			<Link
				href="/admin/teachers"
				className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-dashboard-text-muted hover:text-dashboard-text-primary"
			>
				<HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
				Back to teachers
			</Link>

			<header className="mb-6 border-dashboard-border border-b pb-5">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-lg bg-dashboard-accent-soft text-dashboard-accent">
						<HugeiconsIcon icon={TeacherIcon} size={20} strokeWidth={1.8} />
					</div>
					<div>
						<h1 className="font-semibold text-[24px] text-dashboard-text-primary">
							{teacher.email}
						</h1>
						<p className="text-[13px] text-dashboard-text-muted">
							{teacher.username} · {teacher.role}
						</p>
					</div>
				</div>
			</header>

			{message ? (
				<Alert className="mb-4">
					<AlertDescription>{message}</AlertDescription>
				</Alert>
			) : null}
			{error ? (
				<Alert variant="destructive" className="mb-4">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
				<section className="rounded-[14px] border border-dashboard-border bg-dashboard-surface p-5">
					<h2 className="mb-4 font-medium text-[15px]">Staff profile</h2>
					<form onSubmit={handleSave}>
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor="employee-code">Employee code</FieldLabel>
								<Input
									id="employee-code"
									value={employeeCode}
									onChange={(event) => setEmployeeCode(event.target.value)}
									disabled={!canWrite}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="phone">Phone</FieldLabel>
								<Input
									id="phone"
									value={phone}
									onChange={(event) => setPhone(event.target.value)}
									disabled={!canWrite}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="qualification">Qualification</FieldLabel>
								<Input
									id="qualification"
									value={qualification}
									onChange={(event) => setQualification(event.target.value)}
									disabled={!canWrite}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="specialization">Specialization</FieldLabel>
								<Input
									id="specialization"
									value={specialization}
									onChange={(event) => setSpecialization(event.target.value)}
									disabled={!canWrite}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="hire-date">Hire date</FieldLabel>
								<Input
									id="hire-date"
									type="date"
									value={hireDate}
									onChange={(event) => setHireDate(event.target.value)}
									disabled={!canWrite}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="status">Status</FieldLabel>
								<SelectField
									id="status"
									value={status}
									onValueChange={(value) => setStatus(value as typeof status)}
									disabled={!canWrite}
									items={[
										{ label: "Active", value: "active" },
										{ label: "Inactive", value: "inactive" },
										{ label: "On leave", value: "on_leave" },
									]}
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="notes">Notes</FieldLabel>
								<Input
									id="notes"
									value={notes}
									onChange={(event) => setNotes(event.target.value)}
									disabled={!canWrite}
								/>
							</Field>
							{canWrite ? (
								<Button type="submit" disabled={upsertProfile.isPending}>
									{upsertProfile.isPending ? "Saving..." : "Save profile"}
								</Button>
							) : null}
						</FieldGroup>
					</form>
				</section>

				<div className="space-y-6">
					<section className="rounded-[14px] border border-dashboard-border bg-dashboard-surface p-5">
						<h2 className="mb-3 font-medium text-[15px]">Homeroom sections</h2>
						{homeroomSections.length === 0 ? (
							<p className="text-[13px] text-dashboard-text-muted">No homeroom assigned.</p>
						) : (
							<ul className="space-y-2">
								{homeroomSections.map((section) => (
									<li
										key={section.id}
										className="flex items-center justify-between rounded-lg border border-dashboard-border-subtle px-3 py-2"
									>
										<span className="font-medium text-[13px]">{section.name}</span>
										<Badge variant="outline">Homeroom</Badge>
									</li>
								))}
							</ul>
						)}
					</section>

					<section className="overflow-hidden rounded-[14px] border border-dashboard-border">
						<h2 className="border-dashboard-border-subtle border-b bg-dashboard-surface px-5 py-3 font-medium text-[15px]">
							Subject assignments
						</h2>
						{canWrite ? (
							<form
								onSubmit={handleAssignSubject}
								className="border-dashboard-border-subtle border-b bg-dashboard-surface-elevated px-5 py-4"
							>
								<FieldGroup className="grid gap-3 sm:grid-cols-2">
									<Field>
										<FieldLabel htmlFor="assign-section">Section</FieldLabel>
										<SelectField
											id="assign-section"
											value={assignSectionId}
											onValueChange={setAssignSectionId}
											placeholder="Select section"
											items={sectionItems}
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="assign-subject">Subject</FieldLabel>
										<SelectField
											id="assign-subject"
											value={assignSubjectId}
											onValueChange={setAssignSubjectId}
											placeholder="Select subject"
											items={subjectItems}
										/>
									</Field>
								</FieldGroup>
								<Button
									type="submit"
									size="sm"
									className="mt-3"
									disabled={assignSubject.isPending || !assignSectionId || !assignSubjectId}
								>
									{assignSubject.isPending ? "Assigning..." : "Assign subject"}
								</Button>
							</form>
						) : null}
						<table className="w-full text-[13px]">
							<thead className="bg-dashboard-surface-strong text-left text-[11px] text-dashboard-text-muted uppercase">
								<tr>
									<th className="px-4 py-2.5">Section</th>
									<th className="px-4 py-2.5">Subject</th>
								</tr>
							</thead>
							<tbody>
								{subjectAssignments.length === 0 ? (
									<tr>
										<td colSpan={2} className="px-4 py-4 text-dashboard-text-muted">
											No subject assignments yet.
										</td>
									</tr>
								) : (
									subjectAssignments.map((item) => (
										<tr key={item.id} className="border-dashboard-border-subtle border-t">
											<td className="px-4 py-3">{item.sectionName}</td>
											<td className="px-4 py-3">
												{item.subjectName}{" "}
												<span className="text-dashboard-text-muted">({item.subjectCode})</span>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</section>
				</div>
			</div>
		</div>
	);
}
