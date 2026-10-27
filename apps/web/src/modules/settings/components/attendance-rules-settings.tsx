"use client";

import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import { useOrganizationSettings } from "../hooks/use-organization-settings";
import {
	SETTINGS_CONTROL,
	SettingsHeader,
	SettingsNotice,
	SettingsRow,
	SettingsSection,
	SettingsSwitch,
} from "./settings-parts";

const GRACE_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60].map((minutes) => ({
	value: String(minutes),
	label: minutes === 0 ? "No grace period" : `${minutes} min`,
}));

/** Settings · Attendance rules, on the tenant settings and communication policy. */
export function AttendanceRulesSettings() {
	const { config, loading, canRead, canWrite, save } = useOrganizationSettings();

	return (
		<>
			<SettingsHeader
				title="Attendance rules"
				description="When a student counts as late or absent, and what a sick report needs."
			/>
			{loading ? (
				<div className="flex h-40 items-center justify-center">
					<Spinner className="size-5" />
				</div>
			) : !canRead || !config ? (
				<SettingsNotice>You do not have access to attendance rules.</SettingsNotice>
			) : (
				<SettingsSection title="Marking" description="Applies to every campus.">
					<SettingsRow
						label="Grace period"
						description="How long after the bell a student can arrive before counting as late"
					>
						<SelectField
							aria-label="Grace period"
							items={GRACE_OPTIONS}
							value={String(config.settings.attendanceGraceMinutes)}
							disabled={!canWrite}
							onValueChange={(value) =>
								save({ settings: { attendanceGraceMinutes: Number(value) } })
							}
							className={SETTINGS_CONTROL}
						/>
					</SettingsRow>
					<SettingsRow
						label="Sick reports need a note"
						description="A guardian reporting sickness must attach a note or reason"
					>
						<SettingsSwitch
							label="Sick reports need a note"
							checked={config.communicationPolicy.sickReportRequiresNote}
							disabled={!canWrite}
							onCheckedChange={(sickReportRequiresNote) =>
								save({ communicationPolicy: { sickReportRequiresNote } })
							}
						/>
					</SettingsRow>
				</SettingsSection>
			)}
		</>
	);
}
