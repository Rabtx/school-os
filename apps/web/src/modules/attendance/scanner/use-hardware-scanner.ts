"use client";

import { useEffect, useRef } from "react";

type UseHardwareScannerOptions = {
	/** Whether the hardware scanner listener should be active. */
	active: boolean;
	/** Called with each decoded value (the scanned code, without the trailing Enter). */
	onDecode: (value: string) => void;
};

/**
 * USB/hardware barcode scanner support (keyboard wedge).
 *
 * Most USB barcode scanners emulate a keyboard: they type the code character by
 * character at very high speed, then send Enter. This hook listens for rapid
 * keystrokes on the document and, when a burst of fast keys ends with Enter,
 * treats the accumulated buffer as a scanned code.
 *
 * This "just works" when a scanner is plugged in — no focus management needed.
 */
export function useHardwareScanner({ active, onDecode }: UseHardwareScannerOptions) {
	const bufferRef = useRef("");
	const lastKeyTimeRef = useRef(0);
	const onDecodeRef = useRef(onDecode);
	useEffect(() => {
		onDecodeRef.current = onDecode;
	}, [onDecode]);

	useEffect(() => {
		if (!active) return;

		// Threshold: keys arriving faster than this are considered scanner input.
		const MAX_KEY_INTERVAL_MS = 50;
		const MIN_CODE_LENGTH = 3;

		function handleKeyDown(event: KeyboardEvent) {
			const now = Date.now();
			const interval = now - lastKeyTimeRef.current;
			lastKeyTimeRef.current = now;

			// If too much time passed, reset the buffer (human typing).
			if (interval > MAX_KEY_INTERVAL_MS && bufferRef.current.length > 0) {
				bufferRef.current = "";
			}

			if (event.key === "Enter") {
				const code = bufferRef.current.trim();
				bufferRef.current = "";
				if (code.length >= MIN_CODE_LENGTH) {
					onDecodeRef.current(code);
					// Prevent the Enter from triggering form submits or button clicks.
					event.preventDefault();
					event.stopPropagation();
				}
				return;
			}

			// Only accumulate printable single characters.
			if (event.key.length === 1) {
				bufferRef.current += event.key;
			}
		}

		document.addEventListener("keydown", handleKeyDown, true);
		return () => {
			document.removeEventListener("keydown", handleKeyDown, true);
			bufferRef.current = "";
		};
	}, [active]);
}
