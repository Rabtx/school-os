import { Trend } from "@rabtx/ui/meter";

const days = [96, 100, 92, 88, 74, 95, 100, 97, 81, 99];

export default function MeterTrend() {
	return (
		<Trend
			label="Class 7-B attendance, last 10 school days"
			values={days.map((rate, index) => ({ label: `Day ${index + 1}`, rate }))}
		/>
	);
}
