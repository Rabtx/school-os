import { Field } from "@rabtx/ui/field";
import { Input } from "@rabtx/ui/input";

export default function FieldInvalid() {
	return (
		<Field label="Work email" error="Enter a valid email address." className="w-64">
			<Input type="email" defaultValue="not-an-email" />
		</Field>
	);
}
