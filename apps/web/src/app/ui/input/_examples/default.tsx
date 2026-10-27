import { Field } from "@rabtx/ui/field";
import { Input } from "@rabtx/ui/input";

export default function InputDefault() {
	return (
		<Field label="Email" hint="We only use it to sign you in." className="w-64">
			<Input type="email" placeholder="you@example.com" />
		</Field>
	);
}
