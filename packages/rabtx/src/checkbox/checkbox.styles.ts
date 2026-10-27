/** The box. Colors, the tick and the hit area live in `checkbox.css`. */
export const checkboxClass =
	"rx-check relative size-4 shrink-0 cursor-pointer appearance-none rounded-(--rx-r-check) border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rx-focus) disabled:cursor-not-allowed";

/** The label that wraps the box, so the whole row is clickable. */
export const checkboxLabelClass =
	"inline-flex cursor-pointer items-center gap-2 text-[13px]/5 tracking-[-0.15px] text-(--rx-text) has-disabled:cursor-not-allowed has-disabled:text-(--rx-text-disabled)";
