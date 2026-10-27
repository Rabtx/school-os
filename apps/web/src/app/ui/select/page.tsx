import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import SelectDefault from "./_examples/default";
import SelectSizes from "./_examples/sizes";
import SelectStates from "./_examples/states";

export default function SelectPage() {
	return (
		<Doc>
			<h1>Select</h1>
			<p>A native dropdown, drawn like Input, with a list that follows the menu design.</p>
			<Example file="select/_examples/default.tsx">
				<SelectDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Select } from "@rabtx/ui/select";\n\n<Select aria-label="Team" placeholder="Select a team">\n\t<option value="design">Design</option>\n</Select>`}</pre>
			<p>
				Select wraps a real <code>select</code>, so you pass plain <code>option</code> elements. The
				browser provides the keyboard, typeahead, screen reader support and the picker on phones. In
				browsers with customizable selects the list is styled to match Menu. In others the system
				list opens and the field itself looks the same.
			</p>

			<h2>Sizes and icon</h2>
			<p>Heights are 28, 32 and 36. Medium is the default.</p>
			<Example file="select/_examples/sizes.tsx">
				<SelectSizes />
			</Example>

			<h2>Error and disabled</h2>
			<p>
				In a Field, <code>error</code> turns the edge red and links the message. A{" "}
				<code>placeholder</code> shows in the placeholder color until an option is chosen.
			</p>
			<Example file="select/_examples/states.tsx">
				<SelectStates />
			</Example>

			<h2>API</h2>
			<p>
				Everything a native select takes, except the numeric size, plus the props below. Inside a{" "}
				<code>Field</code> it also receives the id, the description and the invalid state.
			</p>
			<PropsTable
				rows={[
					["size", '"sm" | "md" | "lg"', "Default md."],
					["placeholder", "string", "A hidden first option, shown until a value is chosen."],
					["leadingIcon", "ReactNode", "Sized to 16px."],
					["className", "string", "Applied to the wrapper that draws the field."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					A native select: roles, keyboard, typeahead and announcements come from the browser.
				</li>
				<li>The whole field is the click target. Focus shows a blue edge and a soft ring.</li>
				<li>Give it a visible label through Field, or an aria-label.</li>
			</ul>
		</Doc>
	);
}
