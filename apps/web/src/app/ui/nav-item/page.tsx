import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import NavItemSidebar from "./_examples/sidebar";

export default function NavItemPage() {
	return (
		<Doc>
			<h1>Nav item</h1>
			<p>
				Sidebar links with an icon, a label and an optional count, grouped under small headings.
			</p>
			<Example file="nav-item/_examples/sidebar.tsx">
				<NavItemSidebar />
			</Example>

			<h2>Usage</h2>
			<pre>
				{
					'import { NavItem, NavSection } from "@rabtx/ui/nav-item";\nimport Link from "next/link";\n\n<NavSection heading="Classes">\n  <li><NavItem href="/classes/7b" label="Class 7-B" icon={icon} count={32} active linkAs={Link} /></li>\n</NavSection>'
				}
			</pre>

			<h2>API</h2>
			<PropsTable
				rows={[
					["label", "string", "The link text."],
					["icon", "ReactNode", "Leading icon or swatch."],
					["count", "number", "Shown after the label; zero shows nothing and over 999 reads 999+."],
					["trailing", "ReactNode", "Replaces the count, such as a ⌘K hint."],
					["active", "boolean", "Fills the row and sets aria-current."],
					["collapsed", "boolean", "Icon-only rail; give the label through a tooltip."],
					["linkAs", "ComponentType", "The link component. Default a plain anchor."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>The active link carries aria-current=&quot;page&quot;.</li>
				<li>
					In the collapsed rail the label is not on screen, so pair each item with a tooltip or an
					aria-label.
				</li>
			</ul>
		</Doc>
	);
}
