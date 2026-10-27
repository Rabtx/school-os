"use client";

import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import { useOrganizationSettings } from "../hooks/use-organization-settings";
import {
	SettingsHeader,
	SettingsNotice,
	SettingsRow,
	SettingsSection,
	SettingsSwitch,
} from "./settings-parts";

const HOURS = Array.from({ length: 24 }, (_, hour) => {
	const value = `${String(hour).padStart(2, "0")}:00`;
	const label = new Date(2024, 0, 1, hour).toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
	return { value, label };
});

/** Figma "Settings · Communication" (`77:89099`), on the tenant communication policy. */
export function CommunicationSettings() {
	const { config, loading, canRead, canWrite, save } = useOrganizationSettings();

	return (
		<>
			<SettingsHeader
				title="Communication"
				description="How School OS reaches guardians. Preferences save now and apply once parent messaging is live."
			/>

			<div className="mb-8 flex flex-wrap items-center gap-3 rounded-[12px] border border-dashboard-border bg-dashboard-surface px-4 py-3.5">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-[color-mix(in_oklab,var(--rx-success)_16%,transparent)] text-[var(--rx-success)]">
					<HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={1.8} />
				</span>
				<div className="min-w-0 flex-1">
					<p className="font-medium text-[14px] text-dashboard-text-primary leading-5">
						WhatsApp Business · Cloud API
					</p>
					<p className="text-[13px] text-dashboard-text-dim leading-5">
						Connecting a verified business number arrives with parent messaging.
					</p>
				</div>
				<span className="inline-flex h-6 items-center gap-1.5 rounded-[6px] bg-dashboard-hover px-2 text-[12px] text-dashboard-text-secondary">
					<span aria-hidden className="size-1.5 rounded-full bg-dashboard-text-dim" />
					Not connected
				</span>
			</div>

			{loading ? (
				<div className="flex h-40 items-center justify-center">
					<Spinner className="size-5" />
				</div>
			) : !canRead || !config ? (
				<SettingsNotice>You do not have access to communication settings.</SettingsNotice>
			) : (
				<>
					<SettingsSection
						title="How guardians are reached"
						description="WhatsApp first, then the fallbacks below."
					>
						<SettingsRow
							label="Send alerts on WhatsApp"
							description="Arrival, absence and late notices go to WhatsApp first"
						>
							<SettingsSwitch
								label="Send alerts on WhatsApp"
								checked={config.communicationPolicy.whatsappEnabled}
								disabled={!canWrite}
								onCheckedChange={(whatsappEnabled) =>
									save({ communicationPolicy: { whatsappEnabled } })
								}
							/>
						</SettingsRow>
						<SettingsRow
							label="Message every linked guardian"
							description="Off sends to the primary guardian only"
						>
							<SettingsSwitch
								label="Message every linked guardian"
								checked={config.communicationPolicy.notifyAllGuardians}
								disabled={!canWrite}
								onCheckedChange={(notifyAllGuardians) =>
									save({ communicationPolicy: { notifyAllGuardians } })
								}
							/>
						</SettingsRow>
					</SettingsSection>

					<SettingsSection title="Quiet hours and fallback">
						<SettingsRow label="Quiet hours" description="Hold non-urgent messages until morning">
							<SelectField
								aria-label="Quiet hours start"
								items={HOURS}
								value={config.settings.quietHoursStart.slice(0, 5)}
								disabled={!canWrite}
								onValueChange={(quietHoursStart) => save({ settings: { quietHoursStart } })}
								className="w-[106px]"
							/>
							<span className="text-[13px] text-dashboard-text-dim">to</span>
							<SelectField
								aria-label="Quiet hours end"
								items={HOURS}
								value={config.settings.quietHoursEnd.slice(0, 5)}
								disabled={!canWrite}
								onValueChange={(quietHoursEnd) => save({ settings: { quietHoursEnd } })}
								className="w-[106px]"
							/>
						</SettingsRow>
						<SettingsRow label="SMS fallback" description="If a WhatsApp alert cannot be delivered">
							<SettingsSwitch
								label="SMS fallback"
								checked={config.communicationPolicy.smsFallbackEnabled}
								disabled={!canWrite}
								onCheckedChange={(smsFallbackEnabled) =>
									save({ communicationPolicy: { smsFallbackEnabled } })
								}
							/>
						</SettingsRow>
						<SettingsRow label="Email fallback" description="For guardians with an email on file">
							<SettingsSwitch
								label="Email fallback"
								checked={config.communicationPolicy.emailFallbackEnabled}
								disabled={!canWrite}
								onCheckedChange={(emailFallbackEnabled) =>
									save({ communicationPolicy: { emailFallbackEnabled } })
								}
							/>
						</SettingsRow>
					</SettingsSection>
				</>
			)}
		</>
	);
}
