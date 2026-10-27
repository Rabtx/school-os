import { Field } from "@rabtx/ui/field";
import { Textarea } from "@rabtx/ui/textarea";

export default function TextareaStates() {
	return (
		<div className="grid w-72 gap-4">
			<Field label="Notes" error="Notes can be at most 200 characters.">
				<Textarea defaultValue="Too long…" />
			</Field>
			<Textarea aria-label="Archived notes" defaultValue="Locked" disabled />
		</div>
	);
}
