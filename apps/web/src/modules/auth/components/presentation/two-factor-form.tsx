import { Button } from "@school-os/ui/components/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@school-os/ui/components/field";
import { Input } from "@school-os/ui/components/input";
import { Spinner } from "@school-os/ui/components/spinner";

export function TwoFactorForm({
	code,
	pending,
	onCodeChange,
	onSubmit,
	onCancel,
}: {
	code: string;
	pending: boolean;
	onCodeChange: (value: string) => void;
	onSubmit: (event: React.FormEvent) => void;
	onCancel: () => void;
}) {
	return (
		<form onSubmit={onSubmit}>
			<FieldGroup>
				<Field>
					<FieldLabel htmlFor="two-factor-code">Authentication code</FieldLabel>
					<Input
						id="two-factor-code"
						value={code}
						onChange={(event) => onCodeChange(event.target.value)}
						autoComplete="one-time-code"
						placeholder="123456 or recovery code"
						required
					/>
					<FieldDescription>
						Enter the code from your authenticator or a recovery code.
					</FieldDescription>
				</Field>
				<Button type="submit" disabled={pending}>
					{pending ? <Spinner data-icon="inline-start" /> : null}Verify and continue
				</Button>
				<Button type="button" variant="ghost" onClick={onCancel}>
					Back
				</Button>
			</FieldGroup>
		</form>
	);
}
