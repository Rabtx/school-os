"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BarcodeDetectorLike } from "./scanner.types";

type UseCameraScannerOptions = {
	/** Whether the scanner should be actively running. */
	active: boolean;
	/** Called with each decoded raw value. */
	onDecode: (value: string) => void;
};

type CameraScannerState = {
	status: "idle" | "starting" | "scanning" | "error";
	error: string | null;
};

/**
 * Camera-based QR/barcode scanner using the native BarcodeDetector API.
 *
 * Opens the rear camera, draws frames to an offscreen canvas, and decodes
 * barcodes in a requestAnimationFrame loop. Calls `onDecode` for each unique
 * code (debounced so the same code isn't fired repeatedly within a short window).
 *
 * Returns a ref to attach to a <video> element for the live preview.
 */
export function useCameraScanner({ active, onDecode }: UseCameraScannerOptions) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const [state, setState] = useState<CameraScannerState>({ status: "idle", error: null });
	const streamRef = useRef<MediaStream | null>(null);
	const detectorRef = useRef<BarcodeDetectorLike | null>(null);
	const rafRef = useRef<number | null>(null);
	const lastCodeRef = useRef<{ value: string; at: number } | null>(null);
	const onDecodeRef = useRef(onDecode);
	useEffect(() => {
		onDecodeRef.current = onDecode;
	}, [onDecode]);

	const stop = useCallback(() => {
		if (rafRef.current !== null) {
			cancelAnimationFrame(rafRef.current);
			rafRef.current = null;
		}
		if (streamRef.current) {
			for (const track of streamRef.current.getTracks()) {
				track.stop();
			}
			streamRef.current = null;
		}
		if (videoRef.current) {
			videoRef.current.srcObject = null;
		}
	}, []);

	useEffect(() => {
		if (!active) {
			stop();
			setState({ status: "idle", error: null });
			return;
		}

		let cancelled = false;

		async function start() {
			setState({ status: "starting", error: null });

			// Check for BarcodeDetector support
			if (typeof window === "undefined" || !window.BarcodeDetector) {
				setState({
					status: "error",
					error:
						"BarcodeDetector is not supported in this browser. Use manual entry or a USB scanner.",
				});
				return;
			}

			try {
				const detector = new window.BarcodeDetector({ formats: ["qr_code", "code_128", "ean_13"] });
				detectorRef.current = detector;

				const stream = await navigator.mediaDevices.getUserMedia({
					video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
					audio: false,
				});

				if (cancelled) {
					for (const track of stream.getTracks()) track.stop();
					return;
				}

				streamRef.current = stream;
				const video = videoRef.current;
				if (!video) return;

				video.srcObject = stream;
				await video.play();

				if (cancelled) return;
				setState({ status: "scanning", error: null });

				const canvas = document.createElement("canvas");
				const ctx = canvas.getContext("2d", { willReadFrequently: true });
				if (!ctx) {
					setState({ status: "error", error: "Could not access the camera canvas." });
					return;
				}
				const context = ctx;

				async function scanLoop() {
					if (cancelled || !video || video.readyState < 2 || !detectorRef.current) {
						rafRef.current = requestAnimationFrame(scanLoop);
						return;
					}

					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					context.drawImage(video, 0, 0);

					try {
						const barcodes = await detectorRef.current.detect(canvas);
						for (const barcode of barcodes) {
							const value = barcode.rawValue.trim();
							if (!value) continue;
							const now = Date.now();
							const last = lastCodeRef.current;
							// Debounce: skip the same code within 2 seconds
							if (last && last.value === value && now - last.at < 2000) continue;
							lastCodeRef.current = { value, at: now };
							onDecodeRef.current(value);
						}
					} catch {
						// Detection can throw on certain frames — ignore and continue.
					}

					rafRef.current = requestAnimationFrame(scanLoop);
				}

				rafRef.current = requestAnimationFrame(scanLoop);
			} catch (err) {
				if (cancelled) return;
				const message =
					err instanceof DOMException && err.name === "NotAllowedError"
						? "Camera permission denied. Allow camera access to scan QR codes."
						: err instanceof DOMException && err.name === "NotFoundError"
							? "No camera found on this device."
							: "Could not start the camera scanner.";
				setState({ status: "error", error: message });
			}
		}

		void start();

		return () => {
			cancelled = true;
			stop();
		};
	}, [active, stop]);

	return { videoRef, ...state };
}
