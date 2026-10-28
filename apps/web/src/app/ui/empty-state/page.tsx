import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import EmptyNoResults from "./_examples/no-results";

export default function EmptyStatePage() {
	return (
		<Doc>
			<h1>Empty state</h1>
			<p>The centred message for empty, no-results, no-access and error states.</p>
			<Example file="empty-state/_examples/no-results.tsx">
				<EmptyNoResults />
			</Example>

			<h2>Usage</h2>
			<pre>
				{
					'import { EmptyState } from "@rabtx/ui/empty-state";\n\n<EmptyState mark="0" title="No students match" description="Clear a filter to see more." />'
				}
			</pre>

			<h2>API</h2>
			<PropsTable
				rows={[
					["mark", "ReactNode", "A count, ! or an icon in the circle. Decorative."],
					["title", "string", "Says what is missing."],
					["description", "ReactNode", "One line of why."],
					["children", "ReactNode", "The buttons that get the person unstuck."],
					["tone", '"neutral" | "danger"', "Danger is for errors."],
					["headingLevel", "2 | 3", "Default 2."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					A danger state uses role=&quot;alert&quot; so it is announced at once; the rest use
					role=&quot;status&quot;.
				</li>
				<li>Always offer a way out: clear filters, retry, or who to ask.</li>
			</ul>
		</Doc>
	);
}
