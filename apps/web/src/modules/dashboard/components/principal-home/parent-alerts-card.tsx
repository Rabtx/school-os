import { Message01Icon } from "@hugeicons/core-free-icons";
import { DashboardCard } from "./dashboard-card";

/**
 * Figma "Parent alerts on WhatsApp". Delivery arrives with the WhatsApp card on the board
 * (`str-whatsapp-delivery`); until then the gauge shows an honest empty state.
 */
export function ParentAlertsCard() {
	const radius = 64;
	const arc = `M ${80 - radius} 80 A ${radius} ${radius} 0 0 1 ${80 + radius} 80`;

	return (
		<DashboardCard title="Parent alerts on WhatsApp" icon={Message01Icon}>
			<div className="flex flex-col items-center px-4 pb-4">
				<svg width={160} height={88} viewBox="0 0 160 88" aria-hidden>
					<path
						d={arc}
						fill="none"
						stroke="var(--dashboard-hover)"
						strokeWidth={10}
						strokeLinecap="round"
					/>
				</svg>
				<div className="-mt-11 flex flex-col items-center">
					<span className="font-medium text-[24px] text-dashboard-text-primary leading-8">0</span>
					<span className="text-[12px] text-dashboard-text-dim uppercase">Alerts today</span>
				</div>
				<p className="mt-3 max-w-[260px] text-center text-[12px] text-dashboard-text-dim leading-4">
					WhatsApp is not connected. Absence and late alerts will be sent and tracked here once it
					is.
				</p>
			</div>
		</DashboardCard>
	);
}
