"use client";

import { SelectField } from "@school-os/ui/components/select-field";
import { Spinner } from "@school-os/ui/components/spinner";
import { WhatsAppConnection } from "@/modules/delivery";
import { useTenantContext } from "@/modules/tenants";
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
	const { activeTenant } = useTenantContext();

	return (
		<>
			<SettingsHeader
				title="Communication"
				description="How School OS reaches guardians outside the app: WhatsApp first, then SMS."
			/>

			{activeTenant ? <WhatsAppConnection tenantId={activeTenant.id} canManage={canWrite} /> : null}

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
