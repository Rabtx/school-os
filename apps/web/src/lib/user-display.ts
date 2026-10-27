/** Initials from a display name (e.g. "Jane Doe" → "JD"). */
export function userInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase() || "?";
	}
	return name.slice(0, 2).toUpperCase() || "?";
}

/** First name for greetings. */
export function userFirstName(name: string): string {
	const first = name.trim().split(/\s+/).find(Boolean);
	return first ?? name;
}
