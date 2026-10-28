import type { ReactNode } from "react";
import { type StatDeltaTone, statDeltaClass, statParts } from "./stat.styles";

export type StatCardProps = {
	label: string;
	/** Already formatted ("94.7%", "829"). */
	value: ReactNode;
	/** One line under the rule ("25 / 25 marked"). */
	detail?: ReactNode;
	/** The change against the last period, already formatted ("+1.4"). */
	delta?: { label: string; tone?: StatDeltaTone };
	/** A 14px icon for the chip beside the label. */
	icon?: ReactNode;
	className?: string;
};

/** One headline number with its label, icon and a one-line foot. */
export function StatCard({ label, value, detail, delta, icon, className }: StatCardProps) {
	return (
		<div className={`${statParts.root} ${className ?? ""}`}>
			<div className={statParts.head}>
				<div className={statParts.label}>{label}</div>
				{icon ? (
					<div aria-hidden="true" className={statParts.icon}>
						{icon}
					</div>
				) : null}
			</div>
			<div className={statParts.value}>{value}</div>
			<div className={statParts.rule} />
			<div className={statParts.foot}>
				<p className={statParts.detail}>{detail}</p>
				{delta ? <span className={statDeltaClass(delta.tone)}>{delta.label}</span> : null}
			</div>
		</div>
	);
}
