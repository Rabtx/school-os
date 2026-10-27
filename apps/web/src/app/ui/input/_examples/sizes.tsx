import { Input, type InputSize } from "@rabtx/ui/input";

const sizes: InputSize[] = ["sm", "md", "lg", "xl", "2xl"];

export default function InputSizes() {
	return (
		<div className="grid w-64 gap-3">
			{sizes.map((size) => (
				<Input key={size} size={size} placeholder={size} aria-label={size} />
			))}
		</div>
	);
}
