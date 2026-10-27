import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import CheckboxDefault from "./_examples/default";
import CheckboxMixed from "./_examples/mixed";

export default function CheckboxPage() {
	return (
		<Doc>
			<h1>Checkbox</h1>
			<p>A native checkbox: a 16px rounded square, accent when on.</p>
			<Example file="checkbox/_examples/default.tsx">
				<CheckboxDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Checkbox } from "@rabtx/ui/checkbox";\n\n<Checkbox defaultChecked>Email me updates</Checkbox>`}</pre>
			<p>
				With children, Checkbox wraps the box in a <code>label</code>, so the text names it and the
				whole row is clickable. A bare checkbox needs an <code>aria-label</code>. The box is 16px
				but its click area is 24px.
			</p>

			<h2>Mixed</h2>
			<p>
				<code>mixed</code> shows the partly-checked look, for a &quot;select all&quot; above a list.
				It is derived from your state: the browser clears it when the user clicks, so compute it
				again on every render.
			</p>
			<Example file="checkbox/_examples/mixed.tsx">
				<CheckboxMixed />
			</Example>

			<h2>API</h2>
			<p>Everything a native checkbox takes, plus:</p>
			<PropsTable
				rows={[
					[
						"mixed",
						"boolean",
						"The partly-checked look. Exposed as mixed to assistive technology.",
					],
					["children", "ReactNode", "A label. Wraps the box in a label element."],
					["className", "string", "On the label when there are children, otherwise on the box."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>A real checkbox: Space toggles it, forms submit it, and screen readers announce it.</li>
				<li>Keyboard focus shows a 2px ring. Mixed is announced as mixed.</li>
				<li>The click area is at least 24px, even though the box is 16px.</li>
			</ul>
		</Doc>
	);
}
