import { Button } from "@rabtx/ui/button";
import { Card, cardParts } from "@rabtx/ui/card";

export default function CardDefault() {
	return (
		<Card className="w-72">
			<div>
				<h3 className={cardParts.title}>Invite your team</h3>
				<p className={cardParts.description}>Teammates can view and edit every project.</p>
			</div>
			<div className="flex gap-2">
				<Button size="sm">Invite</Button>
				<Button size="sm" variant="ghost">
					Later
				</Button>
			</div>
		</Card>
	);
}
