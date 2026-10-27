"use client";

import { Input } from "@school-os/ui/components/input";
import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import { useToast } from "@school-os/ui/components/toaster";
import { useState } from "react";
import { useTenantQuery, useUpdateTenantMutation } from "@/modules/tenants";
import { useOrganizationSettings } from "../hooks/use-organization-settings";
import {
	SETTINGS_CONTROL,
	SettingsHeader,
	SettingsNotice,
	SettingsRow,
	SettingsSection,
} from "./settings-parts";

const MONTHS = Array.from({ length: 12 }, (_, index) => ({
	value: String(index + 1),
	label: new Date(2024, index, 1).toLocaleDateString(undefined, { month: "long" }),
}));

const LANGUAGES = [
	{ value: "en", label: "English" },
	{ value: "ur", label: "اردو (Urdu)" },
];

const TIMEZONES = ["Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "UTC"];

/** A text setting that saves when it loses focus or on Enter, and only when it changed. */
function BlurInput({
	id,
	value,
	disabled,
	placeholder,
	dir,
	onSave,
}: {
	id: string;
	value: string;
	disabled?: boolean;
	placeholder?: string;
	dir?: "rtl";
	onSave: (next: string) => void;
}) {
	const [draft, setDraft] = useState(value);
	const [lastValue, setLastValue] = useState(value);
	// A saved value from the server replaces the draft.
	if (value !== lastValue) {
		setLastValue(value);
		setDraft(value);
	}
	const commit = () => {
		const next = draft.trim();
		if (next !== value.trim()) onSave(next);
	};
	return (
		<Input
			id={id}
			value={draft}
			dir={dir}
			disabled={disabled}
			placeholder={placeholder}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === "Enter") event.currentTarget.blur();
			}}
			className={SETTINGS_CONTROL}
		/>
	);
}

/** Settings · General: the school's name, language, time zone and academic calendar. */
export function GeneralSettings() {
	const toast = useToast();
	const { tenantId, config, loading, canRead, canWrite, save } = useOrganizationSettings();
	const tenantQuery = useTenantQuery(tenantId, Boolean(tenantId));
	const updateTenant = useUpdateTenantMutation(tenantId ?? "");
	const tenant = tenantQuery.data;

	const saveTenant = async (input: Parameters<typeof updateTenant.mutateAsync>[0]) => {
		try {
			await updateTenant.mutateAsync(input);
		} catch (error) {
			toast.show({
				title: "Setting not saved",
				description: error instanceof Error ? error.message : "Try again in a moment.",
				status: "error",
			});
		}
	};

	const timezones =
		tenant && !TIMEZONES.includes(tenant.timezone) ? [tenant.timezone, ...TIMEZONES] : TIMEZONES;

	return (
		<>
			<SettingsHeader
				title="General"
				description="Your school's name, language and calendar. Changes save as you make them."
			/>
			{loading || tenantQuery.isLoading ? (
				<div className="flex h-40 items-center justify-center">
					<Spinner className="size-5" />
				</div>
			) : !canRead || !config || !tenant ? (
				<SettingsNotice>You do not have access to school settings.</SettingsNotice>
			) : (
				<>
					<SettingsSection title="School">
						<SettingsRow
							label="School name"
							htmlFor="settings-school-name"
							description="Shown across School OS"
						>
							<BlurInput
								id="settings-school-name"
								value={tenant.name}
								disabled={!canWrite}
								onSave={(name) => {
									if (name.length >= 2) void saveTenant({ name });
								}}
							/>
						</SettingsRow>
						<SettingsRow
							label="Name in Urdu"
							htmlFor="settings-school-name-ur"
							description="Used on Urdu screens, ID cards and messages"
						>
							<BlurInput
								id="settings-school-name-ur"
								dir="rtl"
								value={config.branding.displayNameUr ?? ""}
								disabled={!canWrite}
								placeholder="اسکول کا نام"
								onSave={(displayNameUr) =>
									save({ branding: { displayNameUr: displayNameUr || null } })
								}
							/>
						</SettingsRow>
						<SettingsRow
							label="Default language"
							description="For new members until they pick their own"
						>
							<SelectField
								aria-label="Default language"
								items={LANGUAGES}
								value={tenant.defaultLocale}
								disabled={!canWrite}
								onValueChange={(defaultLocale) => void saveTenant({ defaultLocale })}
								className={SETTINGS_CONTROL}
							/>
						</SettingsRow>
						<SettingsRow label="Time zone" description="The school's local time zone">
							<SelectField
								aria-label="Time zone"
								items={timezones.map((zone) => ({ value: zone, label: zone.replace("_", " ") }))}
								value={tenant.timezone}
								disabled={!canWrite}
								onValueChange={(timezone) => void saveTenant({ timezone })}
								className={SETTINGS_CONTROL}
							/>
						</SettingsRow>
					</SettingsSection>

					<SettingsSection title="Academic calendar">
						<SettingsRow
							label="Academic year starts"
							description="The first month of a new school year"
						>
							<SelectField
								aria-label="Academic year starts"
								items={MONTHS}
								value={String(config.settings.academicYearStartMonth)}
								disabled={!canWrite}
								onValueChange={(value) =>
									save({ settings: { academicYearStartMonth: Number(value) } })
								}
								className={SETTINGS_CONTROL}
							/>
						</SettingsRow>
					</SettingsSection>
				</>
			)}
		</>
	);
}
