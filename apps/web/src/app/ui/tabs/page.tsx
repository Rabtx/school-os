import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import TabsExample from "./_examples/tabs";

export default function TabsPage() {
	return (
		<Doc>
			<h1>Tabs</h1>
			<p>Page sections as links under the page header.</p>
			<Example file="tabs/_examples/tabs.tsx">
				<TabsExample />
			</Example>

			<h2>Usage</h2>
			<pre>
				{
					'import { TabNav } from "@rabtx/ui/tabs";\nimport Link from "next/link";\n\n<TabNav label="Gradebook sections" items={items} linkAs={Link} />'
				}
			</pre>

			<h2>API</h2>
			<PropsTable
				rows={[
					[
						"items",
						"{ label; href; active? }[]",
						"Each tab is a URL, so a section can be shared and the back button works.",
					],
					["label", "string", "Names the navigation for screen readers."],
					[
						"linkAs",
						"ComponentType",
						"The link component, such as Next's Link. Default a plain anchor.",
					],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					Tabs are navigation, not an ARIA tablist: each is a link and the active one carries
					aria-current=&quot;page&quot;.
				</li>
				<li>The row scrolls sideways on narrow screens instead of wrapping.</li>
			</ul>
		</Doc>
	);
}
