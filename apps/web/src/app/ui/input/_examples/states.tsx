import { Input } from "@rabtx/ui/input";

export default function InputStates() {
	return (
		<div className="grid w-64 gap-3">
			<Input defaultValue="not-an-email" aria-label="Email" aria-invalid />
			<Input defaultValue="Locked" aria-label="Workspace" disabled />
		</div>
	);
}
