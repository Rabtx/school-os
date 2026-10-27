import { Field } from "@rabtx/ui/field";
import { Select } from "@rabtx/ui/select";

export default function SelectStates() {
	return (
		<div className="grid w-64 gap-4">
			<Field label="Plan" error="Choose a plan to continue.">
				<Select placeholder="Select a plan">
					<option value="free">Free</option>
					<option value="pro">Pro</option>
				</Select>
			</Field>
			<Select aria-label="Region" defaultValue="eu" disabled>
				<option value="eu">Europe</option>
			</Select>
		</div>
	);
}
