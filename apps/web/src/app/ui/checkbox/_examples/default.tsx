import { Checkbox } from "@rabtx/ui/checkbox";

export default function CheckboxDefault() {
	return (
		<div className="grid gap-3">
			<Checkbox defaultChecked>Email me product updates</Checkbox>
			<Checkbox>Share anonymous usage data</Checkbox>
			<Checkbox disabled>Beta features (not available)</Checkbox>
			<Checkbox disabled defaultChecked>
				Accept the terms (required)
			</Checkbox>
		</div>
	);
}
