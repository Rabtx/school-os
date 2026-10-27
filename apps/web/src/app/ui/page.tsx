import { Doc } from "./_components/doc";

export default function IntroductionPage() {
	return (
		<Doc>
			<h1>Introduction</h1>
			<p>
				Rabtx UI is the component library for Reptex and Grid. It is built on the platform: native
				HTML and CSS, styled with Tailwind, with no animation library and HugeIcons for icons.
			</p>

			<h2>Installation</h2>
			<p>
				Add the workspace package to an app, then import its styles once after Tailwind. The styles
				scan the component classes themselves, so there is no <code>@source</code> line to add.
			</p>
			<pre>{`bun add @rabtx/ui@workspace:*`}</pre>
			<pre>{`@import "tailwindcss";\n@import "@rabtx/ui/styles.css";`}</pre>

			<h2>Modes</h2>
			<p>
				Components never take a prop for theme, depth, radius or motion. Set an attribute on any
				ancestor instead, and everything inside follows. Use the toggles above to try them.
			</p>
			<ul className="mt-2">
				<li>
					<code>data-theme</code>: <code>light</code> or <code>dark</code>
				</li>
				<li>
					<code>data-depth</code>: <code>flat</code> (one 1px border) or <code>floating</code> (the
					default)
				</li>
				<li>
					<code>data-radius</code>: <code>sharp</code>, <code>default</code> or <code>round</code>
				</li>
				<li>
					<code>data-motion</code>: <code>on</code> or <code>off</code>. Reduced motion turns it off
					too.
				</li>
			</ul>
		</Doc>
	);
}
