import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import TextareaDefault from "./_examples/default";
import TextareaStates from "./_examples/states";

export default function TextareaPage() {
	return (
		<Doc>
			<h1>Textarea</h1>
			<p>A multi-line text field, drawn like Input.</p>
			<Example file="textarea/_examples/default.tsx">
				<TextareaDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Field } from "@rabtx/ui/field";\nimport { Textarea } from "@rabtx/ui/textarea";\n\n<Field label="Description">\n\t<Textarea />\n</Field>`}</pre>
			<p>
				The minimum height is 96px, four lines. Set <code>rows</code> for a taller field. Users can
				drag the corner to resize it vertically.
			</p>

			<h2>Error and disabled</h2>
			<p>
				In a Field, <code>error</code> turns the edge red and links the message. Outside a Field,
				set <code>aria-invalid</code> yourself.
			</p>
			<Example file="textarea/_examples/states.tsx">
				<TextareaStates />
			</Example>

			<h2>API</h2>
			<p>
				Everything a native textarea takes. Inside a <code>Field</code> it also receives the id, the
				description and the invalid state.
			</p>
			<PropsTable
				rows={[
					["className", "string", "Applied to the textarea itself."],
					["aria-invalid", "boolean", "Turns the edge red and tells assistive technology."],
					["rows", "number", "Visible lines. The 96px minimum height always applies."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>A real textarea, so spell check, autocomplete and mobile keyboards just work.</li>
				<li>Focus shows a blue edge and a soft ring. Error shows a red edge and a ring.</li>
				<li>Give it a visible label through Field, or an aria-label.</li>
			</ul>
		</Doc>
	);
}
