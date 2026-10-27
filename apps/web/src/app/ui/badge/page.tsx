import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import BadgeDot from "./_examples/dot";
import BadgeTones from "./_examples/tones";

export default function BadgePage() {
	return (
		<Doc>
			<h1>Badge</h1>
			<p>A short status label with a tinted fill.</p>
			<Example file="badge/_examples/tones.tsx">
				<BadgeTones />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Badge } from "@rabtx/ui/badge";\n\n<Badge tone="success">Paid</Badge>`}</pre>
			<p>
				A badge is 20px tall. Its radius follows the page mode: 4px by default, 2px in Sharp and
				fully round in Round.
			</p>

			<h2>Dot</h2>
			<p>
				A dot suits live states. It is decorative, so the label must still say the state in words.
			</p>
			<Example file="badge/_examples/dot.tsx">
				<BadgeDot />
			</Example>

			<h2>API</h2>
			<p>Everything a native span takes, plus:</p>
			<PropsTable
				rows={[
					[
						"tone",
						'"neutral" | "accent" | "success" | "warning" | "danger" | "violet"',
						"Default neutral.",
					],
					["dot", "boolean", "A small dot before the label."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>Never rely on color alone. The text says what the status is.</li>
				<li>
					The text color is each tone darkened (lightened in dark mode) until it passes 4.5:1 on its
					own fill. Figma&apos;s raw tone colors on these fills do not.
				</li>
				<li>A badge is plain text, not a control. It is not focusable.</li>
			</ul>
		</Doc>
	);
}
