import { buttonClass } from "@rabtx/ui/button/styles";
import { EmptyState } from "@rabtx/ui/empty-state";

export default function EmptyNoResults() {
	return (
		<EmptyState
			mark="0"
			title="No students match"
			description="Nothing matches Class 7-B and “Usman”. Clear a filter to see more."
		>
			<button type="button" className={buttonClass({ variant: "secondary", size: "sm" })}>
				Clear all filters
			</button>
		</EmptyState>
	);
}
