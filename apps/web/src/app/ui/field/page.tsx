import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import FieldDefault from "./_examples/default";
import FieldInvalid from "./_examples/invalid";

export default function FieldPage() {
	return (
		<Doc>
			<h1>Field</h1>
			<p>A label, a control and an optional hint or error, linked for assistive technology.</p>
			<Example file="field/_examples/default.tsx">
				<FieldDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Field } from "@rabtx/ui/field";\nimport { Input } from "@rabtx/ui/input";\n\n<Field label="Email" hint="Never shared.">\n\t<Input type="email" />\n</Field>`}</pre>
			<p>
				Field gives its control an <code>id</code> that the label points to, links the hint or error
				with <code>aria-describedby</code> and sets <code>aria-invalid</code> on an error. You write
				none of that.
			</p>

			<h2>Error</h2>
			<p>
				An error replaces the hint, turns the control red and is announced when it appears. Show it
				after the user has left the field or submitted, not on every keystroke.
			</p>
			<Example file="field/_examples/invalid.tsx">
				<FieldInvalid />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["label", "ReactNode", "The visible label. Required."],
					["hint", "ReactNode", "Helper text under the control."],
					["error", "ReactNode", "Replaces the hint and marks the control invalid."],
					["className", "string", "Applied to the wrapper, for example to set a width."],
					["children", "ReactNode", "One control. Input today; Textarea and Select will join it."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>The label is a real label, so clicking it focuses the control.</li>
				<li>The hint or error is the control&apos;s accessible description.</li>
				<li>The message is a polite live region, so a new error is read out.</li>
			</ul>
		</Doc>
	);
}
