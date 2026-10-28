"use client";

import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import Link from "next/link";
import { useAttendancePolicy } from "@/modules/rules/hooks/use-attendance-policy";
import type { AttendancePolicy } from "@/modules/rules/types/rules.types";
import { useOrganizationSettings } from "../hooks/use-organization-settings";
import {
	SETTINGS_CONTROL,
	SettingsHeader,
	SettingsNotice,
	SettingsRow,
	SettingsSection,
	SettingsSwitch,
} from "./settings-parts";

/** "08:15" → "8:15", as the Figma shows school times. */
function clockLabel(time: string): string {
	const [hours = "0", minutes = "00"] = time.split(":");
	return `${Number(hours)}:${minutes}`;
}

/** Quarter-hour times across a school morning, plus the current value if it sits off the grid. */
function timeOptions(current: string, from = 6 * 60, to = 13 * 60) {
	const times = new Set<string>([current]);
	for (let minutes = from; minutes <= to; minutes += 15) {
		times.add(
			`${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
		);
	}
	return [...times].toSorted().map((time) => ({ value: time, label: clockLabel(time) }));
}

const GRACE_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60].map((minutes) => ({
	value: String(minutes),
	label: minutes === 0 ? "No grace period" : `${minutes} minutes`,
}));

const EDIT_WINDOW_OPTIONS: { value: string; label: string }[] = [
	{ value: "2", label: "Within 2 hours" },
	{ value: "24", label: "Within 24 hours" },
	{ value: "48", label: "Within 2 days" },
	{ value: "168", label: "Within a week" },
	{ value: "none", label: "Any time" },
];

const ALERT_DELAY_OPTIONS = [0, 15, 30, 60, 120].map((minutes) => ({
	value: String(minutes),
	label: minutes === 0 ? "As soon as roll call closes" : `${minutes} minutes after`,
}));

/** Settings · Attendance rules (Figma `232:140585`), saved as versions of the school's policy. */
export function AttendanceRulesSettings() {
	const { view, loading, canRead, canWrite, save } = useAttendancePolicy();
	const organization = useOrganizationSettings();

	return (
		<>
			<SettingsHeader
				title="Attendance rules"
				description="When roll call closes, what counts as late, and who is told."
			/>
			{loading ? (
				<div className="flex h-40 items-center justify-center">
					<Spinner className="size-5" />
				</div>
			) : !canRead || !view ? (
				<SettingsNotice>You do not have access to attendance rules.</SettingsNotice>
			) : (
				<PolicyForm
					policy={view.policy}
					lateFrom={view.lateFrom}
					quietHours={view.quietHours}
					version={view.version}
					updatedAt={view.updatedAt}
					canWrite={canWrite}
					save={save}
					sickNote={organization.config?.communicationPolicy.sickReportRequiresNote}
					saveSickNote={(sickReportRequiresNote) =>
						organization.save({ communicationPolicy: { sickReportRequiresNote } })
					}
				/>
			)}
		</>
	);
}

function PolicyForm({
	policy,
	lateFrom,
	quietHours,
	version,
	updatedAt,
	canWrite,
	save,
	sickNote,
	saveSickNote,
}: {
	policy: AttendancePolicy;
	lateFrom: string;
	quietHours: { start: string; end: string };
	version: number;
	updatedAt: string | null;
	canWrite: boolean;
	save: (change: Partial<AttendancePolicy>) => Promise<void>;
	sickNote: boolean | undefined;
	saveSickNote: (value: boolean) => void;
}) {
	const disabled = !canWrite;
	return (
		<>
			<SettingsSection title="Roll call" description="What teachers see each morning.">
				<SettingsRow label="Roll call closes">
					<SelectField
						aria-label="Roll call closes"
						items={timeOptions(policy.rollCallClosesAt)}
						value={policy.rollCallClosesAt}
						disabled={disabled}
						onValueChange={(rollCallClosesAt) => save({ rollCallClosesAt })}
						className={SETTINGS_CONTROL}
					/>
				</SettingsRow>
				<SettingsRow label="Late after" description="Counts as late, not absent">
					<SelectField
						aria-label="Late after"
						items={timeOptions(policy.lateAfter)}
						value={policy.lateAfter}
						disabled={disabled}
						onValueChange={(lateAfter) => save({ lateAfter })}
						className={SETTINGS_CONTROL}
					/>
				</SettingsRow>
				<SettingsRow
					label="Grace period"
					description={`Students arriving from ${clockLabel(lateFrom)} are marked late`}
				>
					<SelectField
						aria-label="Grace period"
						items={GRACE_OPTIONS}
						value={String(policy.graceMinutes)}
						disabled={disabled}
						onValueChange={(value) => save({ graceMinutes: Number(value) })}
						className={SETTINGS_CONTROL}
					/>
				</SettingsRow>
				<SettingsRow
					label="Mark absent by myself"
					description={`If nobody marks a child by ${clockLabel(policy.autoMarkAbsent.at)}`}
				>
					{policy.autoMarkAbsent.enabled ? (
						<SelectField
							aria-label="Mark absent at"
							items={timeOptions(policy.autoMarkAbsent.at)}
							value={policy.autoMarkAbsent.at}
							disabled={disabled}
							onValueChange={(at) => save({ autoMarkAbsent: { ...policy.autoMarkAbsent, at } })}
							className={SETTINGS_CONTROL}
						/>
					) : null}
					<SettingsSwitch
						label="Mark absent by myself"
						checked={policy.autoMarkAbsent.enabled}
						disabled={disabled}
						onCheckedChange={(enabled) =>
							save({ autoMarkAbsent: { ...policy.autoMarkAbsent, enabled } })
						}
					/>
				</SettingsRow>
				<SettingsRow
					label="Excuse from a parent’s message"
					description="When a parent says sick or away"
				>
					<SettingsSwitch
						label="Excuse from a parent’s message"
						checked={policy.excuseFromGuardianMessage}
						disabled={disabled}
						onCheckedChange={(excuseFromGuardianMessage) => save({ excuseFromGuardianMessage })}
					/>
				</SettingsRow>
				{sickNote === undefined ? null : (
					<SettingsRow
						label="Sick reports need a note"
						description="A guardian reporting sickness must attach a note or reason"
					>
						<SettingsSwitch
							label="Sick reports need a note"
							checked={sickNote}
							disabled={disabled}
							onCheckedChange={saveSickNote}
						/>
					</SettingsRow>
				)}
			</SettingsSection>

			<SettingsSection title="The gate" description="Scans on the way in.">
				<SettingsRow
					label="A scan marks a student present"
					description="Teachers can still change it"
				>
					<SettingsSwitch
						label="A scan marks a student present"
						checked={policy.gate.scanMarksPresent}
						disabled={disabled}
						onCheckedChange={(scanMarksPresent) =>
							save({ gate: { ...policy.gate, scanMarksPresent } })
						}
					/>
				</SettingsRow>
				<SettingsRow label="A scan after the bell is late">
					<SettingsSwitch
						label="A scan after the bell is late"
						checked={policy.gate.scanAfterBellIsLate}
						disabled={disabled || !policy.gate.scanMarksPresent}
						onCheckedChange={(scanAfterBellIsLate) =>
							save({ gate: { ...policy.gate, scanAfterBellIsLate } })
						}
					/>
				</SettingsRow>
				<SettingsRow label="Teachers can change a mark" description="After that it goes to you">
					<SelectField
						aria-label="Teachers can change a mark"
						items={EDIT_WINDOW_OPTIONS}
						value={
							policy.teacherEditWindowHours === null
								? "none"
								: String(policy.teacherEditWindowHours)
						}
						disabled={disabled}
						onValueChange={(value) =>
							save({
								teacherEditWindowHours:
									value === "none"
										? null
										: (Number(value) as AttendancePolicy["teacherEditWindowHours"]),
							})
						}
						className={SETTINGS_CONTROL}
					/>
				</SettingsRow>
			</SettingsSection>

			<SettingsSection
				title="Absence alerts"
				description="Telling guardians when a child is missing."
			>
				<SettingsRow
					label="Tell guardians when a child is absent"
					description={
						<>
							Never during quiet hours ({clockLabel(quietHours.start)}–{clockLabel(quietHours.end)},
							set in{" "}
							<Link href="/admin/settings/communication" className="underline underline-offset-2">
								Communication
							</Link>
							). Messages go out once WhatsApp is connected.
						</>
					}
				>
					<SettingsSwitch
						label="Tell guardians when a child is absent"
						checked={policy.absenceAlert.enabled}
						disabled={disabled}
						onCheckedChange={(enabled) =>
							save({ absenceAlert: { ...policy.absenceAlert, enabled } })
						}
					/>
				</SettingsRow>
				{policy.absenceAlert.enabled ? (
					<SettingsRow label="When to tell them" description="After roll call closes">
						<SelectField
							aria-label="When to tell them"
							items={ALERT_DELAY_OPTIONS}
							value={String(policy.absenceAlert.delayMinutes)}
							disabled={disabled}
							onValueChange={(value) =>
								save({ absenceAlert: { ...policy.absenceAlert, delayMinutes: Number(value) } })
							}
							className={SETTINGS_CONTROL}
						/>
					</SettingsRow>
				) : null}
			</SettingsSection>

			<p className="text-[12px] text-dashboard-text-dim">
				{version === 0
					? "These are the starting rules. Your first change saves version 1."
					: `Version ${version}${updatedAt ? `, saved ${new Date(updatedAt).toLocaleString()}` : ""}. Every change is kept in the audit log.`}
			</p>
		</>
	);
}
