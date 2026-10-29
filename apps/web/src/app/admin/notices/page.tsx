import { Spinner } from "@school-os/ui/components/spinner";
import { Suspense } from "react";
import { NoticesPage } from "@/modules/notices";

export default function Page() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-[240px] items-center justify-center">
					<Spinner className="size-6" />
				</div>
			}
		>
			<NoticesPage />
		</Suspense>
	);
}
