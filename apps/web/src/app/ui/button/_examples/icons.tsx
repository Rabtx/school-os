import { Add01Icon, ArrowRight01Icon, Settings01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@rabtx/ui/button";

export default function ButtonIcons() {
	return (
		<>
			<Button variant="secondary" leadingIcon={<HugeiconsIcon icon={Add01Icon} />}>
				New company
			</Button>
			<Button trailingIcon={<HugeiconsIcon icon={ArrowRight01Icon} />}>Continue</Button>
			<Button variant="secondary" iconOnly aria-label="Settings">
				<HugeiconsIcon icon={Settings01Icon} />
			</Button>
		</>
	);
}
