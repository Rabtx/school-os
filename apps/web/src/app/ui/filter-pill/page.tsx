import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import FilterPillNative from "./_examples/native";

export default function FilterPillPage() {
	return (
		<Doc>
			<h1>Filter pill</h1>
			<p>A toolbar filter: its name, then the chosen value as the control.</p>
			<Example file="filter-pill/_examples/native.tsx">
				<FilterPillNative />
			</Example>

			<h2>Usage</h2>
			<pre>
				{
					'import { FilterPillSelect } from "@rabtx/ui/filter-pill";\n\n<FilterPillSelect label="Class" placeholder="All" value={value} onValueChange={setValue} options={classes} />'
				}
			</pre>

			<h2>API</h2>
			<PropsTable
				rows={[
					[
						"label",
						"string",
						"The filter's name, shown dim and used as the control's accessible name.",
					],
					[
						"value / onValueChange",
						"string",
						"The chosen value; an empty string is the placeholder choice.",
					],
					["options", "{ label; value }[]", "The choices."],
					["placeholder", "string", "The empty choice, such as All or Any."],
					[
						"FilterPill",
						"{ label; children }",
						"The frame alone, for an app's own select or menu; style the control with filterPillParts.control.",
					],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					FilterPillSelect is a native select, so keyboard, typeahead and phone pickers come from
					the browser.
				</li>
				<li>
					The visible label is hidden from screen readers and repeated as the select&apos;s
					aria-label, so it is read once.
				</li>
			</ul>
		</Doc>
	);
}
