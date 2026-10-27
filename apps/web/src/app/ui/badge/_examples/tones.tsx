import { Badge, type BadgeTone } from "@rabtx/ui/badge";

const tones: BadgeTone[] = ["neutral", "accent", "success", "warning", "danger", "violet"];

export default function BadgeTones() {
	return tones.map((tone) => (
		<Badge key={tone} tone={tone}>
			{tone}
		</Badge>
	));
}
