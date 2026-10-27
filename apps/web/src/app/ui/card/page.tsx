import { Doc } from "../_components/doc";
import { Example } from "../_components/example";
import { PropsTable } from "../_components/props-table";
import CardDefault from "./_examples/default";
import CardPaddings from "./_examples/padding";

export default function CardPage() {
	return (
		<Doc>
			<h1>Card</h1>
			<p>A container with the shared surface. Compose blocks from it.</p>
			<Example file="card/_examples/default.tsx" muted>
				<CardDefault />
			</Example>

			<h2>Usage</h2>
			<pre>{`import { Card, cardParts } from "@rabtx/ui/card";\n\n<Card>\n\t<h3 className={cardParts.title}>Title</h3>\n\t<p className={cardParts.description}>Description</p>\n</Card>`}</pre>
			<p>
				Card is only a surface and a vertical stack, so it has no header or footer parts. Lay out
				the inside with plain elements. <code>cardParts</code> gives you the title, description and
				meta text styles to put on any of them.
			</p>

			<h2>Padding</h2>
			<p>
				Padding is 12, 16 or 20 pixels. Depth and radius come from the page modes: Flat is one
				border, Floating is the raised surface, and Round makes the corners larger but never a
				capsule.
			</p>
			<Example file="card/_examples/padding.tsx" muted>
				<CardPaddings />
			</Example>

			<h2>API</h2>
			<p>Everything a native element takes, plus:</p>
			<PropsTable
				rows={[
					["padding", '"sm" | "md" | "lg"', "12, 16 or 20px. Default md."],
					["as", '"div" | "section" | "article" | "aside" | "li"', "The element. Default div."],
				]}
			/>

			<h2>Accessibility</h2>
			<ul>
				<li>
					Card adds no role. Use <code>as</code> for a landmark, such as a labelled section.
				</li>
				<li>The description text is the secondary gray, which passes 4.5:1 on the card.</li>
				<li>A clickable card is a different component, because it needs a real link or button.</li>
			</ul>
		</Doc>
	);
}
