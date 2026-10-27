import { Suspense } from "react";
import { MembersPage } from "@/modules/members";

export default function SettingsMembersPage() {
	return (
		<Suspense fallback={null}>
			<MembersPage />
		</Suspense>
	);
}
