"use client";

import { useEffect, useState } from "react";

/** The value once it has stopped changing for `delayMs`, so typing does not fire a request per key. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		const timer = window.setTimeout(() => setSettled(value), delayMs);
		return () => window.clearTimeout(timer);
	}, [value, delayMs]);
	return settled;
}
