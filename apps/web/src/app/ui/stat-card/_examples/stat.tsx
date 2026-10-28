import { StatCard } from "@rabtx/ui/stat";

export default function StatExample() {
	return (
		<div className="grid w-full max-w-xl grid-cols-2 gap-3">
			<StatCard
				label="Attendance today"
				value="94.7%"
				detail="236 / 249 marked"
				delta={{ label: "+1.4", tone: "good" }}
			/>
			<StatCard
				label="Late today"
				value="12"
				detail="of 249 marked"
				delta={{ label: "+4", tone: "bad" }}
			/>
		</div>
	);
}
