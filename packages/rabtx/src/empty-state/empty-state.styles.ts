export type EmptyStateTone = "neutral" | "danger";

/** Figma states (`208:93911`): a round mark, a title, one line of why, then the way out. */
export const emptyStateParts = {
	root: "mx-auto flex max-w-md flex-col items-center px-4 py-12 text-center tracking-[-0.15px]",
	title: "text-[22px]/7 font-[510] text-(--rx-text)",
	description: "mt-2 text-[13px]/5 text-(--rx-text-secondary)",
	actions: "mt-4 flex flex-wrap items-center justify-center gap-2",
};

export function emptyStateMarkClass(tone: EmptyStateTone = "neutral") {
	return `mb-3 flex size-14 items-center justify-center rounded-full bg-(--rx-selected) text-xl font-[510] ${
		tone === "danger" ? "text-(--rx-danger)" : "text-(--rx-text-secondary)"
	}`;
}

/** A danger state is an error the person should hear at once; the rest are polite status. */
export function emptyStateRole(tone: EmptyStateTone = "neutral"): "alert" | "status" {
	return tone === "danger" ? "alert" : "status";
}
