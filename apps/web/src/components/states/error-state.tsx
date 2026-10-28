"use client";

import { StateMessage, stateButtonClass } from "./state-message";

/** A section that failed to load: what failed, and a retry that refetches it. */
export function ErrorState({
	title = "This did not load",
	error,
	onRetry,
	retrying,
}: {
	title?: string;
	error?: unknown;
	onRetry?: () => void;
	retrying?: boolean;
}) {
	const detail =
		error instanceof Error && error.message
			? error.message
			: "Check your connection and try again.";
	return (
		<StateMessage mark="!" tone="danger" title={title} description={detail}>
			{onRetry ? (
				<button
					type="button"
					onClick={onRetry}
					disabled={retrying}
					className={stateButtonClass("primary")}
				>
					{retrying ? "Trying…" : "Try again"}
				</button>
			) : null}
		</StateMessage>
	);
}
