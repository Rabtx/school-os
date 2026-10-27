import { Button, type ButtonSize } from "@rabtx/ui/button";

const sizes: ButtonSize[] = ["sm", "md", "lg", "xl", "2xl"];

export default function ButtonSizes() {
	return sizes.map((size) => (
		<Button key={size} size={size}>
			{size}
		</Button>
	));
}
