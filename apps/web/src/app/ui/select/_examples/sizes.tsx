import { Globe02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Select, type SelectSize } from "@rabtx/ui/select";

const sizes: SelectSize[] = ["sm", "md", "lg"];

export default function SelectSizes() {
	return (
		<div className="grid w-64 gap-3">
			{sizes.map((size) => (
				<Select
					key={size}
					size={size}
					aria-label={size}
					defaultValue="en"
					leadingIcon={size === "lg" ? <HugeiconsIcon icon={Globe02Icon} /> : undefined}
				>
					<option value="en">English</option>
					<option value="fr">Français</option>
					<option value="de">Deutsch</option>
				</Select>
			))}
		</div>
	);
}
