import { Mail01Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Input } from "@rabtx/ui/input";

export default function InputIcons() {
	return (
		<div className="grid w-64 gap-3">
			<Input
				placeholder="Email"
				aria-label="Email"
				leadingIcon={<HugeiconsIcon icon={Mail01Icon} />}
			/>
			<Input
				pill
				placeholder="Search"
				aria-label="Search"
				leadingIcon={<HugeiconsIcon icon={Search01Icon} />}
			/>
		</div>
	);
}
