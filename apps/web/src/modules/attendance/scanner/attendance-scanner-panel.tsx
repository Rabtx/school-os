"use client";

import { CameraIcon, KeyboardIcon, NfcIcon, ScanIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { Input } from "@school-os/ui/components/input";
import { ToggleGroup, ToggleGroupItem } from "@school-os/ui/components/toggle-group";
import { motion, useReducedMotion } from "motion/react";
import { type FormEvent, useState } from "react";
import { EASE_OUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { useCameraScanner } from "./use-camera-scanner";
import { useHardwareScanner } from "./use-hardware-scanner";
import { useNfcScanner } from "./use-nfc-scanner";

type ScanMode = "manual" | "camera" | "nfc" | "hardware";

export type ScanResult = {
	message: string;
	tone: "success" | "already" | "error";
};

type Props = {
	/** Called with each decoded raw value from any scanner source. */
	onDecode: (value: string) => void;
	/** The most recent scan result, shown as a status line. */
	lastResult: ScanResult | null;
	/** Progress: number of students marked so far. */
	markedCount: number;
	/** Progress: total students in the roster. */
	totalCount: number;
};

const MODE_LABELS: Record<ScanMode, string> = {
	manual: "Manual",
	camera: "QR camera",
	nfc: "NFC tap",
	hardware: "USB scanner",
};

export function AttendanceScannerPanel({ onDecode, lastResult, markedCount, totalCount }: Props) {
	const reduce = useReducedMotion();
	const [mode, setMode] = useState<ScanMode>("manual");
	const [manualValue, setManualValue] = useState("");

	const nfc = useNfcScanner({ active: mode === "nfc", onDecode });
	const {
		videoRef: cameraVideoRef,
		status: cameraStatus,
		error: cameraError,
	} = useCameraScanner({ active: mode === "camera", onDecode });
	useHardwareScanner({ active: mode === "hardware", onDecode });

	function handleManualSubmit(event: FormEvent) {
		event.preventDefault();
		const value = manualValue.trim();
		if (!value) return;
		onDecode(value);
		setManualValue("");
	}

	return (
		<motion.div
			initial={reduce ? false : { opacity: 0, y: -8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.28, ease: EASE_OUT }}
		>
			<div className="rounded-[14px] border border-dashed border-dashboard-accent/40 bg-dashboard-accent-soft/40 p-3">
				<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
					<p className="font-medium text-[12px] text-dashboard-text-primary">
						Scan students to mark present
					</p>
					<span className="text-[11px] tabular-nums text-dashboard-text-muted">
						{markedCount}/{totalCount} marked
					</span>
				</div>

				<ToggleGroup
					value={[mode]}
					onValueChange={(next) => {
						const selected = next[0] as ScanMode | undefined;
						if (selected) setMode(selected);
					}}
					variant="outline"
					size="sm"
					spacing={0}
					aria-label="Scan mode"
					className="mb-3 flex-wrap"
				>
					<ToggleGroupItem value="manual" className="gap-1.5 px-2.5">
						<HugeiconsIcon icon={KeyboardIcon} strokeWidth={2} className="size-3.5" />
						<span className="hidden sm:inline">{MODE_LABELS.manual}</span>
					</ToggleGroupItem>
					<ToggleGroupItem value="camera" className="gap-1.5 px-2.5">
						<HugeiconsIcon icon={CameraIcon} strokeWidth={2} className="size-3.5" />
						<span className="hidden sm:inline">{MODE_LABELS.camera}</span>
					</ToggleGroupItem>
					<ToggleGroupItem value="nfc" className="gap-1.5 px-2.5" disabled={!nfc.supported}>
						<HugeiconsIcon icon={NfcIcon} strokeWidth={2} className="size-3.5" />
						<span className="hidden sm:inline">{MODE_LABELS.nfc}</span>
					</ToggleGroupItem>
					<ToggleGroupItem value="hardware" className="gap-1.5 px-2.5">
						<HugeiconsIcon icon={ScanIcon} strokeWidth={2} className="size-3.5" />
						<span className="hidden sm:inline">{MODE_LABELS.hardware}</span>
					</ToggleGroupItem>
				</ToggleGroup>

				{/* Manual entry */}
				{mode === "manual" ? (
					<form onSubmit={handleManualSubmit} className="flex gap-2">
						<Input
							value={manualValue}
							onChange={(event) => setManualValue(event.target.value)}
							placeholder="Type admission no. + Enter"
							className="flex-1 font-mono text-[13px]"
							// oxlint-disable-next-line jsx-a11y/no-autofocus -- the user just chose manual entry; the field is the only target
							autoFocus
						/>
						<Button type="submit" size="sm" disabled={!manualValue.trim()}>
							Mark
						</Button>
					</form>
				) : null}

				{/* Camera preview */}
				{mode === "camera" ? (
					<div className="relative overflow-hidden rounded-[10px] bg-black">
						<video
							ref={cameraVideoRef}
							className="aspect-[4/3] w-full object-cover"
							muted
							playsInline
						/>
						{/* Scan region overlay */}
						<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
							<div className="size-40 rounded-[12px] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
						</div>
						{cameraStatus === "starting" ? (
							<div className="absolute inset-0 flex items-center justify-center bg-black/50 text-[13px] text-white">
								Starting camera…
							</div>
						) : null}
						{cameraStatus === "error" ? (
							<div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-[13px] text-white">
								{cameraError}
							</div>
						) : null}
					</div>
				) : null}

				{/* NFC prompt */}
				{mode === "nfc" ? (
					<div
						className={cn(
							"flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed py-8 text-center",
							nfc.status === "scanning"
								? "border-dashboard-accent/50 bg-dashboard-accent-soft/30"
								: "border-dashboard-border",
						)}
					>
						<HugeiconsIcon
							icon={NfcIcon}
							strokeWidth={1.5}
							className={cn(
								"size-10",
								nfc.status === "scanning" ? "text-dashboard-accent" : "text-dashboard-text-muted",
							)}
						/>
						<p className="text-[13px] text-dashboard-text-secondary">
							{nfc.status === "scanning"
								? "Hold a student NFC card near the device"
								: nfc.status === "error"
									? nfc.error
									: "Starting NFC reader…"}
						</p>
					</div>
				) : null}

				{/* Hardware scanner prompt */}
				{mode === "hardware" ? (
					<div className="flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed border-dashboard-border py-8 text-center">
						<HugeiconsIcon
							icon={ScanIcon}
							strokeWidth={1.5}
							className="size-10 text-dashboard-text-muted"
						/>
						<p className="text-[13px] text-dashboard-text-secondary">
							Plug in a USB barcode scanner and scan a student card. It works automatically — no
							clicking needed.
						</p>
					</div>
				) : null}

				{/* Last scan status line */}
				{lastResult ? (
					<p
						className={cn(
							"mt-3 rounded-[8px] px-2.5 py-1.5 text-[12px] font-medium",
							lastResult.tone === "success" &&
								"bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
							lastResult.tone === "already" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
							lastResult.tone === "error" && "bg-red-500/10 text-red-700 dark:text-red-400",
						)}
					>
						{lastResult.message}
					</p>
				) : null}
			</div>
		</motion.div>
	);
}
