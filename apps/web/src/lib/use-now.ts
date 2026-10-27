"use client";

import { useState } from "react";

/**
 * The time the component first rendered, kept stable across re-renders so render stays pure.
 * Screens that show "today" read this instead of calling `new Date()` while rendering.
 */
export function useNow(): Date {
	const [now] = useState(() => new Date());
	return now;
}
