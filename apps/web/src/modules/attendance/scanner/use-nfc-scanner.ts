"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseNfcScannerOptions = {
	/** Whether NFC scanning should be active. */
	active: boolean;
	/** Called with each decoded tag value (serial number or NDEF text). */
	onDecode: (value: string) => void;
};

type NfcScannerState = {
	supported: boolean;
	status: "idle" | "scanning" | "error";
	error: string | null;
};

/**
 * Web NFC scanner using the NDEFReader API (Chrome on Android only).
 *
 * When active, starts an NFC scan session and calls `onDecode` with the tag's
 * serial number or the first text/URL NDEF record. Gracefully reports
 * unsupported browsers so the UI can hide/disable the NFC option.
 */
export function useNfcScanner({ active, onDecode }: UseNfcScannerOptions) {
	const [state, setState] = useState<NfcScannerState>({
		supported: typeof window !== "undefined" && "NDEFReader" in window,
		status: "idle",
		error: null,
	});
	const abortRef = useRef<AbortController | null>(null);
	const readerRef = useRef<NDEFReader | null>(null);
	const onDecodeRef = useRef(onDecode);
	useEffect(() => {
		onDecodeRef.current = onDecode;
	}, [onDecode]);

	const stop = useCallback(() => {
		if (abortRef.current) {
			abortRef.current.abort();
			abortRef.current = null;
		}
		readerRef.current = null;
	}, []);

	useEffect(() => {
		if (!active || !state.supported) {
			stop();
			setState((prev) => ({ ...prev, status: "idle", error: null }));
			return;
		}

		let cancelled = false;

		async function start() {
			try {
				const abortController = new AbortController();
				abortRef.current = abortController;

				// NDEFReader is declared globally in scanner.types.ts
				const reader = new NDEFReader();
				readerRef.current = reader;

				await reader.scan({ signal: abortController.signal });
				if (cancelled) return;
				setState((prev) => ({ ...prev, status: "scanning", error: null }));

				reader.addEventListener("reading", (event) => {
					// Prefer a text/URL NDEF record; fall back to the tag serial number.
					let value = event.serialNumber;
					const record = event.message?.records[0];
					if (record) {
						if (typeof record.toText === "function") {
							value = record.toText();
						} else if (typeof record.data === "string") {
							value = record.data;
						}
					}
					if (value) onDecodeRef.current(value.trim());
				});
			} catch (err) {
				if (cancelled) return;
				const message =
					err instanceof DOMException && err.name === "NotAllowedError"
						? "NFC permission denied."
						: "Could not start NFC scanning.";
				setState((prev) => ({ ...prev, status: "error", error: message }));
			}
		}

		void start();

		return () => {
			cancelled = true;
			stop();
		};
	}, [active, state.supported, stop]);

	return { ...state };
}
