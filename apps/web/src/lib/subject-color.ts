/**
 * Subject colours: the validated categorical slots (dark surface), picked by a stable hash of the
 * subject name so a subject keeps the same colour on every screen.
 */
const SUBJECT_COLORS = [
	"#3987e5",
	"#d95926",
	"#199e70",
	"#c98500",
	"#d55181",
	"#9085e9",
	"#e66767",
	"#008300",
];

export function subjectColor(name: string): string {
	let hash = 0;
	for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) % 997;
	return SUBJECT_COLORS[hash % SUBJECT_COLORS.length] ?? SUBJECT_COLORS[0] ?? "#3987e5";
}
