import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import AvatarSizes from "./_examples/sizes";
import AvatarRow from "./_examples/row";

export default function AvatarPage() {
	return (
		<Doc>
			<h1>Avatar</h1>
			<p>Round initials for people and classes.</p>
			<Example file="avatar/_examples/sizes.tsx">
				<AvatarSizes />
			</Example>

			<h2>Usage</h2>
			<pre>{'import { Avatar } from "@rabtx/ui/avatar";\n\n<Avatar name="Ali Hassan" />'}</pre>

			<h2>Next to a name</h2>
			<p>In table rows the avatar sits before the name, which carries the meaning.</p>
			<Example file="avatar/_examples/row.tsx">
				<AvatarRow />
			</Example>

			<h2>API</h2>
			<PropsTable
				rows={[
					["name", "string", "Up to two initials are taken from it."],
					["tone", '"neutral" | "accent" | "success"', "Default neutral."],
					["size", '"sm" | "md" | "lg"', "24, 32 or 56px. Default sm."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>The avatar is hidden from screen readers. Always show the name beside it.</li>
				<li>Initials come from the first two words, so Ali Hassan Khan reads AH.</li>
			</ul>
		</Doc>
	);
}
