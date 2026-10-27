import { Field } from "@rabtx/ui/field";
import { Textarea } from "@rabtx/ui/textarea";

export default function TextareaDefault() {
	return (
		<Field label="Description" hint="Shown on the project page." className="w-72">
			<Textarea placeholder="Add a description…" />
		</Field>
	);
}
