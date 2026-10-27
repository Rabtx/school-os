import { Field } from "@rabtx/ui/field";
import { Input } from "@rabtx/ui/input";

export default function FieldDefault() {
	return (
		<Field label="Workspace name" hint="You can change this later." className="w-64">
			<Input placeholder="Acme" />
		</Field>
	);
}
