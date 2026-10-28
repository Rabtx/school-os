import { Meter } from "@rabtx/ui/meter";

export default function MeterRates() {
	return (
		<div className="flex flex-col gap-2">
			<Meter rate={97} />
			<Meter rate={62} />
			<Meter rate={18} />
			<Meter rate={null} />
		</div>
	);
}
