"use client";

import { useRouter } from "next/navigation";
import { StateMessage, stateButtonClass } from "./state-message";

/**
 * Figma "No access" (`209:112623`): says plainly what this role cannot see, what it can, and
 * who decides. Never a bare error.
 */
export function NoAccess({
	title,
	description,
	backHref,
}: {
	title: string;
	description: string;
	/** Where "Go back" leads when there is no history to return to. */
	backHref?: string;
}) {
	const router = useRouter();
	return (
		<StateMessage mark="!" title={title} description={description}>
			<button
				type="button"
				onClick={() => {
					if (window.history.length > 1) router.back();
					else router.push(backHref ?? "/admin");
				}}
				className={stateButtonClass("secondary")}
			>
				Go back
			</button>
		</StateMessage>
	);
}
