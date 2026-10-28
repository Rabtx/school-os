import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import StatExample from "./_examples/stat";

export default function StatCardPage() {
	return (
		<Doc>
			<h1>Stat card</h1>
			<p>One headline number with its label, an optional icon and a one-line foot.</p>
			<Example file="stat-card/_examples/stat.tsx">
				<StatExample />
			</Example>

			<h2>Usage</h2>
			<pre>
				{
					'import { StatCard } from "@rabtx/ui/stat";\n\n<StatCard label="Attendance today" value="94.7%" detail="236 / 249 marked" delta={{ label: "+1.4", tone: "good" }} />'
				}
			</pre>

			<h2>API</h2>
			<PropsTable
				rows={[
					["label", "string", "Shown in capitals above the value."],
					["value", "ReactNode", "Already formatted."],
					["detail", "ReactNode", "One line under the rule."],
					[
						"delta",
						"{ label: string; tone? }",
						'tone: "good" | "bad" | "neutral". Good reads accent, bad reads red.',
					],
					["icon", "ReactNode", "A 14px icon for the chip."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					The delta&apos;s tone follows meaning, not direction: more late arrivals is bad even
					though the number went up.
				</li>
				<li>Numbers use tabular figures so cards in a row line up.</li>
			</ul>
		</Doc>
	);
}
