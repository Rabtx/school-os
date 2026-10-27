import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import ButtonIcons from "./_examples/icons";
import ButtonLoading from "./_examples/loading";
import ButtonSizes from "./_examples/sizes";
import ButtonVariants from "./_examples/variants";

export default function ButtonPage() {
	return (
		<Doc>
			<h1>Button</h1>
			<p>A native button with five styles and five sizes.</p>
			<Example file="button/_examples/variants.tsx">
				<ButtonVariants />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Button } from "@rabtx/ui/button";\n\n<Button variant="secondary">Cancel</Button>`}</pre>

			<h2>Sizes</h2>
			<p>Heights are 24, 28, 36, 44 and 48. Medium is the default.</p>
			<Example file="button/_examples/sizes.tsx">
				<ButtonSizes />
			</Example>

			<h2>Icons</h2>
			<p>
				Pass HugeIcons as <code>leadingIcon</code> or <code>trailingIcon</code>. An icon-only button
				is a square and requires an <code>aria-label</code>.
			</p>
			<Example file="button/_examples/icons.tsx">
				<ButtonIcons />
			</Example>

			<h2>Loading</h2>
			<p>The label cross-fades to a spinner and the button keeps its width. Click to try it.</p>
			<Example file="button/_examples/loading.tsx">
				<ButtonLoading />
			</Example>

			<h2>API</h2>
			<p>Everything a native button takes, plus:</p>
			<PropsTable
				rows={[
					[
						"variant",
						'"primary" | "secondary" | "ghost" | "accent" | "danger"',
						"Default primary.",
					],
					["size", '"sm" | "md" | "lg" | "xl" | "2xl"', "Default md."],
					["loading", "boolean", "Shows the spinner, sets aria-busy and blocks clicks."],
					["iconOnly", "boolean", "A square button. Needs aria-label."],
					["leadingIcon / trailingIcon", "ReactNode", "Sized to 16px, or 20px at 2xl."],
					["static", "boolean", "Removes the press scale."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					A real <code>button</code> with <code>type="button"</code> by default.
				</li>
				<li>Keyboard focus shows a 2px ring. Mouse clicks do not.</li>
				<li>Loading stays focusable. Hover only applies where a real hover exists.</li>
				<li>With motion off, or reduced motion, every state is visible and nothing travels.</li>
			</ul>
		</Doc>
	);
}
