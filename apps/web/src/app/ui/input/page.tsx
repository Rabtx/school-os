import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import InputDefault from "./_examples/default";
import InputIcons from "./_examples/icons";
import InputSizes from "./_examples/sizes";
import InputStates from "./_examples/states";

export default function InputPage() {
	return (
		<Doc>
			<h1>Input</h1>
			<p>A single-line text field, recessed instead of raised.</p>
			<Example file="input/_examples/default.tsx">
				<InputDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Input } from "@rabtx/ui/input";\n\n<Input placeholder="Search" aria-label="Search" />`}</pre>
			<p>
				Give every input a visible <code>label</code> or an <code>aria-label</code>. A placeholder
				is not a label.
			</p>

			<h2>Sizes</h2>
			<p>Heights are 28, 32, 36, 44 and 48. Medium is the default.</p>
			<Example file="input/_examples/sizes.tsx">
				<InputSizes />
			</Example>

			<h2>Icons and shape</h2>
			<p>
				Leading and trailing icons are HugeIcons. <code>pill</code> makes the field fully round and
				does not depend on the radius mode.
			</p>
			<Example file="input/_examples/icons.tsx">
				<InputIcons />
			</Example>

			<h2>Error and disabled</h2>
			<p>
				<code>aria-invalid</code> turns the edge red and tells assistive technology. A disabled
				field drops its recess.
			</p>
			<Example file="input/_examples/states.tsx">
				<InputStates />
			</Example>

			<h2>API</h2>
			<p>Everything a native input takes, except the numeric size, plus:</p>
			<PropsTable
				rows={[
					["size", '"sm" | "md" | "lg" | "xl" | "2xl"', "Default md."],
					["pill", "boolean", "Fully round."],
					["leadingIcon / trailingIcon", "ReactNode", "Sized to 16px, or 20px at 2xl."],
					["className", "string", "Applied to the wrapper that draws the field."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>A real input, so type, autocomplete, validation and mobile keyboards just work.</li>
				<li>Clicking the padding or an icon focuses the input. Tab order is unchanged.</li>
				<li>Focus shows a blue edge and a soft ring. Error shows a red edge and a red ring.</li>
			</ul>
		</Doc>
	);
}
