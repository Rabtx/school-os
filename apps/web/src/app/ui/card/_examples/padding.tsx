import { Card, type CardPadding, cardParts } from "@rabtx/ui/card";

const paddings: CardPadding[] = ["sm", "md", "lg"];

export default function CardPaddings() {
	return paddings.map((padding) => (
		<Card key={padding} padding={padding} className="w-40">
			<span className={cardParts.title}>{padding}</span>
			<span className={cardParts.meta}>Padding</span>
		</Card>
	));
}
