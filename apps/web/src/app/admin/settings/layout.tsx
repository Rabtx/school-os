import type { ReactNode } from "react";
import { SettingsNav } from "@/modules/settings";

export default function SettingsLayout({ children }: { children: ReactNode }) {
	return (
		<div className="mx-auto flex w-full min-w-0 max-w-[1200px] flex-col gap-6 px-4 py-5 tracking-[-0.15px] sm:px-6 md:flex-row md:gap-8">
			<aside className="md:w-[200px] md:shrink-0">
				<SettingsNav />
			</aside>
			<div className="min-w-0 max-w-[720px] flex-1">{children}</div>
		</div>
	);
}
