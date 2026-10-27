import { FlashIcon } from "@hugeicons/core-free-icons";
import { CardLabel, DashboardCard } from "./dashboard-card";

type Props = {
	sources: Array<{ source: string; count: number }>;
	loading: boolean;
};

/** Fixed categorical order (validated blue, orange, aqua on the dark surface). */
const METHODS = [
	{ id: "gate", label: "QR at gate", color: "#2d7cf6", sources: ["scan", "qr", "gate", "nfc"] },
	{ id: "roll", label: "Roll call", color: "#d95926", sources: ["manual"] },
	{ id: "desk", label: "Front desk", color: "#199e70", sources: ["front_desk", "desk"] },
];

/** Figma "Check-in method": students checked in today, split by how they were marked. */
export function CheckInMethodCard({ sources, loading }: Props) {
	const rows = METHODS.map((method) => ({
		id: method.id,
		label: method.label,
		color: method.color,
		count: sources
			.filter((row) => method.sources.includes(row.source))
			.reduce((sum, row) => sum + row.count, 0),
	}));
	const total = rows.reduce((sum, row) => sum + row.count, 0);

	return (
		<DashboardCard title="Check-in method" icon={FlashIcon}>
			<div className="px-4 pb-4">
				<div className="mb-3 flex items-baseline gap-2">
					<CardLabel>Checked in</CardLabel>
					<span className="font-medium text-[16px] text-dashboard-text-primary tabular-nums">
						{loading ? "…" : total}
					</span>
				</div>
				{total === 0 ? (
					<p className="text-[13px] text-dashboard-text-dim">
						{loading ? "Loading…" : "No check-ins recorded for this day yet."}
					</p>
				) : (
					<>
						<div className="flex h-2 gap-0.5" role="img" aria-label="Check-in method split">
							{rows
								.filter((row) => row.count > 0)
								.map((row) => (
									<span
										key={row.id}
										className="h-full rounded-full"
										style={{ width: `${(row.count / total) * 100}%`, background: row.color }}
									/>
								))}
						</div>
						<ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
							{rows.map((row) => (
								<li key={row.id} className="flex items-center gap-1.5 text-dashboard-text-dim">
									<span
										aria-hidden
										className="h-2.5 w-[3px] rounded-full"
										style={{ background: row.color }}
									/>
									<span className="font-medium text-dashboard-text-primary tabular-nums">
										{Math.round((row.count / total) * 100)}%
									</span>
									{row.label}
								</li>
							))}
						</ul>
					</>
				)}
			</div>
		</DashboardCard>
	);
}
