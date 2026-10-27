"use client";

import { QrCodeIcon, SentIcon, Tick02Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Tabs, TabsList, TabsTrigger } from "@school-os/ui/components/tabs";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
	DEMO_PARENT,
	DEMO_STUDENT,
	dicebearUrl,
	WALKTHROUGH_PHASES,
	WALKTHROUGH_WHATSAPP,
	type WalkthroughPhaseId,
	WORKFLOW_STEPS,
} from "../data/landing.data";
import { ATLAS_EASE } from "../lib/motion";
import { cn } from "../lib/utils";
import { DemoGlassCard } from "./demo-glass-card";

const PHASE_TO_STEP: Record<WalkthroughPhaseId, number> = {
	scan: 0,
	identify: 0,
	mark: 1,
	queue: 2,
	notify: 3,
	dashboard: 4,
};

const WHATSAPP_VISIBLE: Record<WalkthroughPhaseId, number> = {
	scan: 0,
	identify: 0,
	mark: 0,
	queue: 0,
	notify: 1,
	dashboard: 3,
};

function phaseIndex(id: WalkthroughPhaseId): number {
	return WALKTHROUGH_PHASES.findIndex((phase) => phase.id === id);
}

export function AttendanceWalkthrough() {
	const reduceMotion = useReducedMotion();
	const [phaseIdx, setPhaseIdx] = useState(0);
	const phase = WALKTHROUGH_PHASES[phaseIdx] ?? WALKTHROUGH_PHASES[0];
	const activeStep = PHASE_TO_STEP[phase.id];
	const whatsappCount = WHATSAPP_VISIBLE[phase.id];
	const activeWorkflow = WORKFLOW_STEPS[activeStep];

	const advance = useCallback(() => {
		setPhaseIdx((prev) => (prev + 1) % WALKTHROUGH_PHASES.length);
	}, []);

	useEffect(() => {
		if (reduceMotion) {
			return;
		}
		const timer = window.setTimeout(advance, phase.durationMs);
		return () => window.clearTimeout(timer);
	}, [advance, phase.durationMs, reduceMotion]);

	return (
		<div className="flex flex-col gap-3 sm:gap-4">
			<WalkthroughStepper
				currentIndex={phaseIdx}
				onSelect={setPhaseIdx}
				reduceMotion={!!reduceMotion}
			/>

			<div className="grid items-stretch gap-3 sm:grid-cols-2 sm:gap-4">
				<GuardScannerPanel phase={phase.id} reduceMotion={!!reduceMotion} />

				<div className="flex min-w-0 flex-col gap-3 sm:gap-4">
					{activeWorkflow ? (
						<MobilePipelineStep step={activeWorkflow} phase={phase.id} className="sm:hidden" />
					) : null}

					<WorkflowTimeline activeStep={activeStep} phase={phase.id} className="hidden sm:block" />

					<WhatsAppPanel visibleCount={whatsappCount} phase={phase.id} />
					<DashboardStrip show={phase.id === "dashboard"} reduceMotion={!!reduceMotion} />
				</div>
			</div>
		</div>
	);
}

type StepperProps = {
	currentIndex: number;
	onSelect: (index: number) => void;
	reduceMotion: boolean;
};

function WalkthroughStepper({ currentIndex, onSelect, reduceMotion }: StepperProps) {
	return (
		<Tabs
			value={currentIndex}
			onValueChange={(value) => onSelect(Number(value))}
			aria-label="Attendance demo steps"
			className="w-full flex-row"
		>
			<TabsList className="-mx-1 h-auto w-full snap-x snap-mandatory items-center justify-start gap-1.5 overflow-x-auto rounded-none bg-transparent p-0 px-1 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
				{WALKTHROUGH_PHASES.map((step, index) => {
					const isActive = index === currentIndex;
					const isDone = index < currentIndex;

					return (
						<TabsTrigger
							key={step.id}
							value={index}
							className={cn(
								"relative shrink-0 snap-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] data-active:bg-transparent sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-[11px]",
								isActive
									? "bg-card/95 text-primary shadow-sm ring-1 ring-border/80 hover:bg-card/95 hover:text-primary data-active:text-primary dark:bg-card/95 dark:text-primary dark:data-active:bg-card/95 dark:data-active:text-primary"
									: isDone
										? "bg-foreground/12 text-foreground/90 hover:bg-foreground/12 hover:text-foreground/90 data-active:text-foreground/90 dark:text-foreground/90 dark:data-active:bg-foreground/12 dark:data-active:text-foreground/90"
										: "bg-foreground/8 text-foreground/70 hover:bg-foreground/12 data-active:text-foreground/70 dark:text-foreground/70 dark:data-active:bg-foreground/8 dark:data-active:text-foreground/70",
							)}
						>
							{isDone ? (
								<span className="grid size-3.5 place-items-center rounded-full bg-emerald-500 text-white">
									<HugeiconsIcon icon={Tick02Icon} className="size-2" aria-hidden={true} />
								</span>
							) : (
								<span
									className={cn(
										"size-1.5 rounded-full",
										isActive ? "bg-primary atlas-live-dot" : "bg-foreground/35",
									)}
								/>
							)}
							<span className="sm:hidden">{step.shortLabel}</span>
							<span className="hidden sm:inline">{step.label}</span>
							{isActive && !reduceMotion ? (
								<span className="pointer-events-none absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary/60" />
							) : null}
						</TabsTrigger>
					);
				})}
			</TabsList>
		</Tabs>
	);
}

type GuardScannerPanelProps = {
	phase: WalkthroughPhaseId;
	reduceMotion: boolean;
};

function GuardScannerPanel({ phase, reduceMotion }: GuardScannerPanelProps) {
	const showStudent = phaseIndex(phase) >= phaseIndex("identify");
	const showStamp = phaseIndex(phase) >= phaseIndex("mark");

	return (
		<DemoGlassCard variant="device">
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="font-semibold text-neutral-900 text-sm">Gate guard · mobile</p>
					<p className="truncate text-[11px] text-neutral-500">
						{DEMO_STUDENT.campus} · {DEMO_STUDENT.gate}
					</p>
				</div>
				<span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-[10px] text-emerald-700">
					Smart Attendance
				</span>
			</div>

			<div className="relative mt-3 min-h-[14.5rem] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-950 p-2.5 sm:mt-4 sm:min-h-[15rem] sm:p-3">
				<div className="relative flex min-h-[12.5rem] items-center justify-center sm:min-h-[13rem]">
					<motion.div
						className="absolute inset-0 flex items-center justify-center"
						animate={{ opacity: showStudent ? 0 : 1 }}
						transition={{ duration: 0.35, ease: ATLAS_EASE }}
						aria-hidden={showStudent}
					>
						<div className="relative mx-auto aspect-[4/5] w-full max-w-[10.5rem] sm:max-w-[11rem]">
							<div className="absolute inset-0 rounded-xl border-2 border-emerald-400/40" />
							<div className="absolute top-2 left-2 size-4 border-emerald-400 border-t-2 border-l-2 sm:top-3 sm:left-3 sm:size-5" />
							<div className="absolute top-2 right-2 size-4 border-emerald-400 border-t-2 border-r-2 sm:top-3 sm:right-3 sm:size-5" />
							<div className="absolute bottom-2 left-2 size-4 border-emerald-400 border-b-2 border-l-2 sm:bottom-3 sm:left-3 sm:size-5" />
							<div className="absolute bottom-2 right-2 size-4 border-emerald-400 border-b-2 border-r-2 sm:bottom-3 sm:right-3 sm:size-5" />

							<div className="absolute inset-3 grid place-items-center rounded-lg bg-white p-2 sm:inset-4">
								<QrCodePattern />
							</div>

							{!reduceMotion ? (
								<motion.div
									className="absolute inset-x-3 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] sm:inset-x-4"
									animate={{ top: ["12%", "78%", "12%"] }}
									transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
								/>
							) : null}

							<p className="absolute inset-x-0 bottom-1.5 text-center font-medium text-[9px] text-emerald-300 sm:bottom-2 sm:text-[10px]">
								Align student QR in frame
							</p>
						</div>
					</motion.div>

					<motion.div
						className="absolute inset-0 flex items-center justify-center px-1"
						animate={{ opacity: showStudent ? 1 : 0 }}
						transition={{ duration: 0.35, ease: ATLAS_EASE }}
						aria-hidden={!showStudent}
					>
						<div className="w-full max-w-[14rem] sm:max-w-[13rem]">
							<StudentCard showStamp={showStamp} reduceMotion={reduceMotion} />
						</div>
					</motion.div>
				</div>
			</div>

			<p className="mt-2.5 min-h-[2.5rem] text-center text-[11px] text-neutral-500 sm:mt-3">
				{phase === "scan"
					? "Scanning signed QR token…"
					: phase === "identify"
						? "Student matched · verifying enrolment"
						: showStamp
							? "Attendance saved · alert queued"
							: "Ready to mark present"}
			</p>
		</DemoGlassCard>
	);
}

function QrCodePattern() {
	return (
		<div className="grid size-full grid-cols-5 grid-rows-5 gap-0.5 p-1" aria-hidden="true">
			{Array.from({ length: 25 }, (_, i) => (
				<span
					key={i}
					className={cn(
						"rounded-[1px]",
						[0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 20, 21, 22, 24].includes(i)
							? "bg-neutral-900"
							: "bg-neutral-200",
					)}
				/>
			))}
		</div>
	);
}

type StudentCardProps = {
	showStamp: boolean;
	reduceMotion: boolean;
};

function StudentCard({ showStamp, reduceMotion }: StudentCardProps) {
	return (
		<div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
			<div className="flex items-center gap-3">
				{/* oxlint-disable-next-line nextjs/no-img-element -- dicebear demo avatar */}
				<img
					src={dicebearUrl(DEMO_STUDENT.avatarSeed)}
					alt=""
					className="size-11 shrink-0 rounded-full ring-2 ring-emerald-100 sm:size-12"
				/>
				<div className="min-w-0">
					<p className="truncate font-semibold text-neutral-900 text-sm">{DEMO_STUDENT.name}</p>
					<p className="text-[11px] text-neutral-500">
						Class {DEMO_STUDENT.class} · {DEMO_STUDENT.section}
					</p>
					<p className="truncate font-mono text-[10px] text-neutral-400">
						{DEMO_STUDENT.studentId}
					</p>
				</div>
			</div>

			<div className="mt-3 flex items-center justify-between rounded-lg bg-neutral-50 px-2.5 py-2">
				<span className="text-[10px] text-neutral-500">Token verified</span>
				<span className="inline-flex items-center gap-1 font-medium text-[10px] text-emerald-700">
					<HugeiconsIcon icon={Tick02Icon} className="size-3" aria-hidden={true} />
					Signed
				</span>
			</div>

			<AnimatePresence>
				{showStamp ? (
					<motion.div
						key="stamp"
						initial={reduceMotion ? false : { opacity: 0, scale: 1.6, rotate: -12 }}
						animate={{ opacity: 1, scale: 1, rotate: -6 }}
						transition={{ type: "spring", stiffness: 380, damping: 22 }}
						className="pointer-events-none absolute inset-0 grid place-items-center bg-emerald-500/10"
					>
						<span className="rounded-lg border-2 border-emerald-600 bg-emerald-50/95 px-3 py-1.5 font-bold text-emerald-700 text-xs tracking-wider shadow-lg sm:px-4 sm:py-2 sm:text-sm">
							PRESENT
						</span>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}

type MobilePipelineStepProps = {
	step: (typeof WORKFLOW_STEPS)[number];
	phase: WalkthroughPhaseId;
	className?: string;
};

function MobilePipelineStep({ step, phase, className }: MobilePipelineStepProps) {
	return (
		<DemoGlassCard variant="device" className={className}>
			<div className="flex items-center gap-2">
				<span className="grid size-7 shrink-0 place-items-center rounded-full bg-emerald-50 text-primary">
					<HugeiconsIcon icon={QrCodeIcon} className="size-3.5" aria-hidden={true} />
				</span>
				<div className="min-w-0">
					<p className="font-semibold text-neutral-900 text-sm">Live pipeline</p>
					<p className="text-[10px] text-neutral-500">Step {phaseIndex(phase) + 1} of 6</p>
				</div>
				<span className="ml-auto font-mono text-[9px] text-emerald-600">live</span>
			</div>
			<motion.div
				key={step.id}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.25, ease: ATLAS_EASE }}
				className="mt-3 min-h-[4.75rem] rounded-xl bg-emerald-50/80 px-3 py-2.5"
			>
				<p className="font-medium text-emerald-900 text-xs">{step.label}</p>
				<p className="mt-0.5 text-[11px] text-neutral-600">{step.detail}</p>
			</motion.div>
		</DemoGlassCard>
	);
}

type WorkflowTimelineProps = {
	activeStep: number;
	phase: WalkthroughPhaseId;
	className?: string;
};

function WorkflowTimeline({ activeStep, phase, className }: WorkflowTimelineProps) {
	return (
		<DemoGlassCard variant="device" className={className}>
			<div className="flex items-center gap-2">
				<span className="grid size-7 place-items-center rounded-full bg-emerald-50 text-primary">
					<HugeiconsIcon icon={QrCodeIcon} className="size-3.5" aria-hidden={true} />
				</span>
				<div>
					<p className="font-semibold text-neutral-900 text-sm">Live pipeline</p>
					<p className="text-[10px] text-neutral-500">Outbox · WhatsApp · dashboard</p>
				</div>
			</div>

			<ol className="mt-3 flex max-h-[14rem] flex-col overflow-y-auto pr-0.5">
				{WORKFLOW_STEPS.map((step, index) => {
					const isActive = index === activeStep;
					const isDone = index < activeStep;

					return (
						<li
							key={step.id}
							className={cn(
								"flex gap-3 rounded-lg py-1.5 pr-1 transition-colors",
								isActive && "bg-emerald-50/80",
							)}
						>
							<span className="mt-1 flex flex-col items-center">
								<motion.span
									animate={
										isActive
											? { scale: [1, 1.25, 1], opacity: 1 }
											: { scale: 1, opacity: isDone ? 1 : 0.45 }
									}
									transition={{ duration: 0.8, repeat: isActive ? Number.POSITIVE_INFINITY : 0 }}
									className={cn(
										"size-2 rounded-full",
										isDone || isActive ? "bg-emerald-500" : "bg-neutral-300",
									)}
								/>
								{index < WORKFLOW_STEPS.length - 1 ? (
									<span
										className={cn(
											"mt-0.5 h-4 w-px sm:h-5",
											isDone ? "bg-emerald-300" : "bg-neutral-200",
										)}
									/>
								) : null}
							</span>
							<div className="min-w-0 flex-1">
								<div className="flex items-center justify-between gap-2">
									<p
										className={cn(
											"font-medium text-xs",
											isActive ? "text-emerald-800" : "text-neutral-800",
										)}
									>
										{step.label}
									</p>
									{isDone ? (
										<motion.span
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											className="grid size-4 place-items-center rounded-full bg-emerald-500 text-white"
										>
											<HugeiconsIcon icon={Tick02Icon} className="size-2.5" aria-hidden={true} />
										</motion.span>
									) : isActive ? (
										<span className="font-mono text-[9px] text-emerald-600">live</span>
									) : null}
								</div>
								<p className="text-[11px] text-neutral-500">{step.detail}</p>
							</div>
						</li>
					);
				})}
			</ol>

			<div className="mt-2 min-h-[1.25rem] text-center">
				<motion.p
					animate={{ opacity: phase === "dashboard" ? 1 : 0 }}
					transition={{ duration: 0.25, ease: ATLAS_EASE }}
					className="font-medium text-[10px] text-emerald-700"
					aria-hidden={phase !== "dashboard"}
				>
					Full loop complete · restarting demo
				</motion.p>
			</div>
		</DemoGlassCard>
	);
}

type WhatsAppPanelProps = {
	visibleCount: number;
	phase: WalkthroughPhaseId;
};

function WhatsAppPanel({ visibleCount, phase }: WhatsAppPanelProps) {
	return (
		<DemoGlassCard variant="device">
			<div className="flex items-center gap-2 border-neutral-100 border-b pb-3">
				<span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#dcf8e8] text-[var(--school-whatsapp)]">
					<HugeiconsIcon icon={WhatsappIcon} className="size-4" aria-hidden={true} />
				</span>
				<div className="min-w-0">
					<p className="truncate font-semibold text-neutral-900 text-sm">
						{DEMO_PARENT.name} · WhatsApp
					</p>
					<p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
						<span
							className={cn(
								"size-1.5 shrink-0 rounded-full",
								visibleCount > 0 ? "bg-emerald-500" : "bg-neutral-300",
							)}
						/>
						{visibleCount > 0 ? "Message delivered · Hassan ki walida" : "Waiting for gate scan…"}
					</p>
				</div>
			</div>

			<div className="relative min-h-[9.5rem] py-3 sm:min-h-[10.5rem]">
				{WALKTHROUGH_WHATSAPP.map((message, index) => {
					const visible = index < visibleCount;
					return (
						<motion.div
							key={message.text}
							className={cn(
								"mb-2 last:mb-0",
								message.role === "user"
									? "ml-auto max-w-[92%] rounded-2xl rounded-br-sm bg-[#dcf8e8] px-3 py-2 text-neutral-800 text-[11px] leading-5"
									: "flex max-w-[95%] items-start gap-2",
							)}
							animate={{ opacity: visible ? 1 : 0 }}
							transition={{ duration: 0.35, ease: ATLAS_EASE }}
							aria-hidden={!visible}
						>
							{message.role === "agent" ? (
								<>
									<span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#dcf8e8] text-[var(--school-whatsapp)]">
										<HugeiconsIcon icon={WhatsappIcon} className="size-3" aria-hidden={true} />
									</span>
									<p className="rounded-2xl rounded-bl-sm border border-neutral-100 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-700 leading-5">
										{message.text}
									</p>
								</>
							) : (
								message.text
							)}
						</motion.div>
					);
				})}

				<p
					className={cn(
						"absolute inset-0 m-auto flex h-fit items-center justify-center px-2 text-center text-[11px] text-neutral-400 italic transition-opacity",
						visibleCount === 0 ? "opacity-100" : "pointer-events-none opacity-0",
					)}
				>
					Parent alert appears after Hassan is marked present
				</p>
			</div>

			<div className="flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2">
				<span className="min-w-0 truncate text-[11px] text-neutral-400">
					{phase === "notify" ? "Sending utility template…" : "Attendance ya fees poochhein…"}
				</span>
				<span className="ml-auto grid size-6 shrink-0 place-items-center rounded-full bg-[var(--school-whatsapp)] text-white">
					<HugeiconsIcon icon={SentIcon} className="size-3" aria-hidden={true} />
				</span>
			</div>
		</DemoGlassCard>
	);
}

type DashboardStripProps = {
	show: boolean;
	reduceMotion: boolean;
};

function DashboardStrip({ show, reduceMotion }: DashboardStripProps) {
	return (
		<div className="min-h-[5.25rem] sm:min-h-[4.75rem]">
			<motion.div
				animate={{ opacity: show ? 1 : 0 }}
				transition={{ duration: reduceMotion ? 0 : 0.35, ease: ATLAS_EASE }}
				className={cn(!show && "pointer-events-none")}
				aria-hidden={!show}
			>
				<DemoGlassCard variant="device">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="font-semibold text-neutral-900 text-xs">Principal dashboard</p>
							<p className="text-[10px] text-neutral-500">
								{DEMO_STUDENT.campus} · subah counts live
							</p>
						</div>
						<div className="grid grid-cols-3 gap-2 sm:flex sm:gap-3">
							<StatPill label="Present" value={247} highlight reduceMotion={reduceMotion} />
							<StatPill label="Absent" value={3} reduceMotion={reduceMotion} />
							<StatPill label="Late" value={1} reduceMotion={reduceMotion} />
						</div>
					</div>
				</DemoGlassCard>
			</motion.div>
		</div>
	);
}

type StatPillProps = {
	label: string;
	value: number;
	highlight?: boolean;
	reduceMotion: boolean;
};

function StatPill({ label, value, highlight, reduceMotion }: StatPillProps) {
	return (
		<div className="rounded-lg bg-neutral-50 px-2 py-1.5 text-center sm:bg-transparent sm:px-0 sm:py-0">
			<motion.p
				key={value}
				initial={reduceMotion || !highlight ? false : { scale: 0.85, opacity: 0.5 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: "spring", stiffness: 400, damping: 24 }}
				className={cn(
					"font-serif text-base tabular-nums tracking-tight sm:text-lg",
					highlight ? "text-emerald-700" : "text-neutral-800",
				)}
			>
				{value}
			</motion.p>
			<p className="text-[9px] text-neutral-500 uppercase tracking-wide">{label}</p>
		</div>
	);
}
