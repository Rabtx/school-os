import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import SegmentedAttendance from "./_examples/attendance";

export default function SegmentedControlPage() {
	return (
		<Doc>
			<h1>Segmented control</h1>
			<p>One choice from a few, side by side, such as a roll call mark.</p>
			<Example file="segmented-control/_examples/attendance.tsx">
				<SegmentedAttendance />
			</Example>

			<h2>Usage</h2>
			<pre>
				{
					'import { SegmentedControl } from "@rabtx/ui/segmented";\n\n<SegmentedControl label="Attendance for Ali Hassan" options={options} value={mark} onChange={setMark} />'
				}
			</pre>

			<h2>API</h2>
			<PropsTable
				rows={[
					[
						"options",
						"{ value; label; tone? }[]",
						'tone: "neutral" | "accent" | "warning" | "danger"',
					],
					["value", "T | null", "Null when nothing is chosen yet."],
					["onChange", "(value: T) => void", "Called with the new choice."],
					["label", "string", "Names the group for screen readers."],
					["disabled", "boolean", "Shows the choice without letting it change."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					It is a radio group: Tab reaches the chosen segment, and the arrow keys, Home and End move
					the choice.
				</li>
				<li>The selected segment&apos;s tone supports its label; the word still says the state.</li>
			</ul>
		</Doc>
	);
}
