import { Field } from "@rabtx/ui/field";
import { Select } from "@rabtx/ui/select";

export default function SelectDefault() {
	return (
		<Field label="Team" hint="Who owns this project." className="w-64">
			<Select placeholder="Select a team">
				<option value="design">Design</option>
				<option value="engineering">Engineering</option>
				<option value="growth">Growth</option>
				<option value="ops" disabled>
					Operations (full)
				</option>
			</Select>
		</Field>
	);
}
