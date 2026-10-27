import { Badge } from "@rabtx/ui/badge";

export default function BadgeDot() {
	return (
		<>
			<Badge dot tone="success">
				Active
			</Badge>
			<Badge dot tone="warning">
				Pending
			</Badge>
			<Badge dot tone="danger">
				Failed
			</Badge>
		</>
	);
}
