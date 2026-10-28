import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import MeterRates from "./_examples/meter";
import MeterTrend from "./_examples/trend";

export default function MeterPage() {
	return (
		<Doc>
			<h1>Meter and trend</h1>
			<p>A rate as 20 ticks with the number beside it, and a run of rates as small columns.</p>
			<Example file="meter/_examples/meter.tsx">
				<MeterRates />
			</Example>

			<h2>Usage</h2>
			<pre>
				{
					'import { Meter, Trend } from "@rabtx/ui/meter";\n\n<Meter rate={96} />\n<Trend label="Attendance, last 10 days" values={days} />'
				}
			</pre>

			<h2>Trend</h2>
			<p>Columns run oldest first. One under the threshold (85% by default) reads red.</p>
			<Example file="meter/_examples/trend.tsx">
				<MeterTrend />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["rate (Meter)", "number | null", "0–100. Null reads as a dash."],
					["values (Trend)", "{ label: string; rate: number }[]", "Oldest first."],
					["label (Trend)", "string", "What the trend is of, read before the values."],
					["threshold (Trend)", "number", "Default 85."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>The meter&apos;s ticks are decorative; the rate is printed as text.</li>
				<li>
					A trend is one image whose label reads every value, so screen readers get the numbers, not
					the bars.
				</li>
				<li>Red, amber and green always come with the number, never alone.</li>
			</ul>
		</Doc>
	);
}
