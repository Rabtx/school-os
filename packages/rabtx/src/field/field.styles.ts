/** Classes for the parts of a Field. React, Solid and plain HTML all use these. */
export const fieldParts = {
	root: "grid gap-1.5",
	label: "text-[13px]/5 font-[510] tracking-[-0.15px] text-(--rx-text)",
	/** The hint, or the error: set `data-invalid` on it to turn it red. */
	message: "text-xs/4 tracking-[-0.15px] text-(--rx-text-tertiary) data-invalid:text-(--rx-danger)",
};
