"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
	window.addEventListener("online", onChange);
	window.addEventListener("offline", onChange);
	return () => {
		window.removeEventListener("online", onChange);
		window.removeEventListener("offline", onChange);
	};
}

/**
 * Figma "Offline and error" (`208:98960`): a banner across the top while the browser is offline.
 * Requests fail until the connection returns; "Try again" reloads once it is back.
 */
export function OfflineBanner() {
	const online = useSyncExternalStore(
		subscribe,
		() => navigator.onLine,
		() => true,
	);
	if (online) return null;
	return (
		<div
			role="alert"
			className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-[10px] border border-[color-mix(in_oklab,var(--rx-danger)_45%,transparent)] bg-[color-mix(in_oklab,var(--rx-danger)_14%,transparent)] px-4 py-2.5 sm:mx-6"
		>
			<div className="min-w-0 flex-1">
				<p className="font-medium text-[14px] text-[var(--rx-danger)] leading-5">You are offline</p>
				<p className="text-[13px] text-dashboard-text-secondary leading-5">
					Changes will not save until you are back online.
				</p>
			</div>
			<button
				type="button"
				onClick={() => window.location.reload()}
				className="inline-flex h-7 items-center rounded-[6px] border border-dashboard-border-strong bg-dashboard-surface px-3 font-medium text-[13px] text-dashboard-text-primary hover:bg-dashboard-hover"
			>
				Try again
			</button>
		</div>
	);
}
