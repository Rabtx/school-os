"use client";

import { Tabs, TabsList, TabsTrigger } from "@school-os/ui/components/tabs";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
	type KeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useId,
	useRef,
	useState,
} from "react";
import { PRICING_FEATURES, PRICING_TIERS } from "../data/landing.data";
import { ATLAS_EASE, hoverTap, springSnappy, springSoft } from "../lib/motion";
import { cn } from "../lib/utils";
import { FadeIn } from "./fade-in";

type Billing = "monthly" | "yearly";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function formatStudents(students: number | "unlimited"): string {
	return students === "unlimited" ? "Unlimited" : String(students);
}

function priceForTier(index: number, billing: Billing): number {
	const monthly = PRICING_TIERS[index]?.monthly ?? 0;
	if (billing === "yearly") {
		// 2 months free → pay for 10 months, shown as monthly equivalent
		return Math.round((monthly * 10) / 12);
	}
	return monthly;
}

export function PricingSection() {
	const [billing, setBilling] = useState<Billing>("monthly");
	const [tierIndex, setTierIndex] = useState(2);
	const reduceMotion = useReducedMotion();

	const tier = PRICING_TIERS[tierIndex] ?? PRICING_TIERS[2];
	const price = priceForTier(tierIndex, billing);
	const period = billing === "monthly" ? "/ month" : "/ month, billed yearly";
	const servicesLabel =
		tier.services === "unlimited"
			? `${tier.label} — unlimited students, multi-campus chains.`
			: `${tier.label} — up to ${formatStudents(tier.services)} students.`;

	return (
		<section id="pricing" className="w-full px-4 pt-20 pb-8 sm:px-8">
			<div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
				<FadeIn>
					<span className="inline-flex items-center rounded-full border border-border bg-card px-3.5 py-1.5 font-medium text-muted-foreground text-xs">
						Pricing
					</span>
				</FadeIn>
				<FadeIn delay={0.06}>
					<h2 className="mt-5 text-balance font-serif text-4xl text-foreground leading-tight tracking-[-0.02em] sm:text-5xl">
						Start free. Grow with your school.
					</h2>
				</FadeIn>
				<FadeIn delay={0.1}>
					<p className="mt-4 max-w-xl text-pretty text-muted-foreground leading-7">
						Pilot attendance and alerts for free. Slide for student count as you add communication,
						finance, and AI modules — no surprise overages.
					</p>
				</FadeIn>
			</div>

			<div className="mt-10 flex justify-center">
				<div className="w-full max-w-xl text-left">
					<FadeIn delay={0.12}>
						<div className="flex items-end gap-2">
							<RollingPrice value={price} reduceMotion={!!reduceMotion} />
							<span className="pb-1.5 text-muted-foreground text-xl">{period}</span>
						</div>
						<p className="mt-4 text-muted-foreground">{servicesLabel}</p>
					</FadeIn>

					<FadeIn delay={0.16} className="mt-7">
						<BillingToggle billing={billing} onChange={setBilling} />
					</FadeIn>

					<FadeIn delay={0.2} className="mt-8">
						<ServicesSlider index={tierIndex} onChange={setTierIndex} />
					</FadeIn>

					<FadeIn delay={0.24} className="mt-10">
						<p className="font-semibold text-foreground text-sm uppercase tracking-wide">
							In every plan
						</p>
						<ul className="mt-5 flex flex-col gap-3.5">
							{PRICING_FEATURES.map((feature, index) => (
								<motion.li
									key={feature}
									initial={reduceMotion ? false : { opacity: 0, x: -8 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true, margin: "-40px" }}
									transition={{ duration: 0.45, delay: index * 0.05, ease: ATLAS_EASE }}
									whileHover={reduceMotion ? undefined : { x: 4 }}
									className="flex gap-3 text-foreground text-lg leading-7"
								>
									<span aria-hidden="true" className="text-muted-foreground">
										—
									</span>
									<span>{feature}</span>
								</motion.li>
							))}
						</ul>
					</FadeIn>

					<FadeIn delay={0.28} className="mt-9 flex flex-wrap items-center gap-4">
						<motion.div
							whileHover={{ scale: 1.03, y: -2 }}
							whileTap={hoverTap}
							transition={springSnappy}
						>
							<Link
								href="/billing"
								className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Get started
							</Link>
						</motion.div>
						<p className="text-muted-foreground text-sm leading-5">
							Starter is free forever — clone and run, no card required.
						</p>
					</FadeIn>
				</div>
			</div>
		</section>
	);
}

function RollingPrice({ value, reduceMotion }: { value: number; reduceMotion: boolean }) {
	const digits = String(value).split("");

	return (
		<span className="inline-flex items-center font-mono text-6xl text-foreground tabular-nums tracking-tight leading-none">
			<span className="sr-only">${value}</span>
			<span aria-hidden="true" className="inline-flex items-center">
				<span>$</span>
				{digits.map((digit, index) => (
					<RollingDigit
						// oxlint-disable-next-line react/no-array-index-key -- digit columns are positional
						key={`${digits.length}-${index}`}
						digit={Number(digit)}
						reduceMotion={reduceMotion}
					/>
				))}
			</span>
		</span>
	);
}

function RollingDigit({ digit, reduceMotion }: { digit: number; reduceMotion: boolean }) {
	return (
		<span
			className="relative inline-block overflow-hidden"
			style={{ height: "1.1em", width: "1ch" }}
		>
			<motion.span
				className="absolute inset-x-0 top-0 flex flex-col items-center will-change-transform"
				initial={false}
				animate={{ y: `-${digit * 1.1}em` }}
				transition={reduceMotion ? { duration: 0 } : springSoft}
			>
				{DIGITS.map((n) => (
					<span key={n} className="flex h-[1.1em] items-center justify-center leading-none">
						{n}
					</span>
				))}
			</motion.span>
		</span>
	);
}

function BillingToggle({
	billing,
	onChange,
}: {
	billing: Billing;
	onChange: (value: Billing) => void;
}) {
	const reduceMotion = useReducedMotion();

	return (
		<Tabs
			value={billing}
			onValueChange={(value) => onChange(value as Billing)}
			aria-label="Billing period"
			className="w-fit flex-row items-center"
		>
			<TabsList className="h-auto items-center gap-1 rounded-full bg-secondary p-1">
				<LayoutGroup id="pricing-billing">
					{(
						[
							{ id: "monthly" as const, label: "Monthly" },
							{ id: "yearly" as const, label: "Yearly" },
						] as const
					).map((option) => {
						const selected = billing === option.id;
						return (
							<div key={option.id} className="relative">
								{selected ? (
									<motion.span
										layoutId={reduceMotion ? undefined : "pricing-billing-pill"}
										className="absolute inset-0 rounded-full bg-primary shadow-sm"
										transition={springSnappy}
										style={{ borderRadius: 9999 }}
									/>
								) : null}
								<TabsTrigger
									value={option.id}
									className={cn(
										"relative z-10 rounded-full bg-transparent px-3.5 py-1.5 text-sm data-active:bg-transparent dark:data-active:bg-transparent",
										selected
											? "text-primary-foreground hover:text-primary-foreground data-active:text-primary-foreground dark:text-primary-foreground dark:data-active:text-primary-foreground"
											: "text-foreground/80 hover:text-foreground dark:text-foreground/80 dark:hover:text-foreground",
									)}
								>
									{option.label}
								</TabsTrigger>
							</div>
						);
					})}
				</LayoutGroup>
				<span className="pr-3 pl-1 font-medium text-primary text-xs">2 months free</span>
			</TabsList>
		</Tabs>
	);
}

function ServicesSlider({ index, onChange }: { index: number; onChange: (index: number) => void }) {
	const trackRef = useRef<HTMLDivElement>(null);
	const dragging = useRef(false);
	const max = PRICING_TIERS.length - 1;
	const percent = max === 0 ? 0 : (index / max) * 100;
	const labelId = useId();

	const syncFromClientX = useCallback(
		(clientX: number) => {
			const el = trackRef.current;
			if (!el) {
				return;
			}
			const rect = el.getBoundingClientRect();
			const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
			onChange(Math.round(ratio * max));
		},
		[max, onChange],
	);

	const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
		dragging.current = true;
		event.currentTarget.setPointerCapture(event.pointerId);
		syncFromClientX(event.clientX);
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
		if (!dragging.current) {
			return;
		}
		syncFromClientX(event.clientX);
	};

	const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
		dragging.current = false;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
			event.preventDefault();
			onChange(Math.max(0, index - 1));
		}
		if (event.key === "ArrowRight" || event.key === "ArrowUp") {
			event.preventDefault();
			onChange(Math.min(max, index + 1));
		}
		if (event.key === "Home") {
			event.preventDefault();
			onChange(0);
		}
		if (event.key === "End") {
			event.preventDefault();
			onChange(max);
		}
	};

	return (
		<div>
			<div
				ref={trackRef}
				role="presentation"
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onPointerCancel={onPointerUp}
				className="relative flex h-12 w-full cursor-grab touch-none select-none items-center overflow-hidden rounded-lg bg-muted active:cursor-grabbing"
			>
				<motion.div
					className="absolute inset-y-0 left-0 bg-foreground/15"
					initial={false}
					animate={{ width: `${percent}%` }}
					transition={springSnappy}
				/>

				<div className="pointer-events-none absolute inset-x-2 inset-y-0">
					{PRICING_TIERS.map((tier, step) => (
						<span
							key={formatStudents(tier.services)}
							className="absolute top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/25"
							style={{ left: `${(step / max) * 100}%` }}
						/>
					))}
				</div>

				<motion.div
					role="slider"
					tabIndex={0}
					aria-labelledby={labelId}
					aria-valuemin={0}
					aria-valuemax={max}
					aria-valuenow={index}
					aria-valuetext={`${formatStudents(PRICING_TIERS[index]?.services ?? 100)} students`}
					onKeyDown={onKeyDown}
					className="absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-foreground shadow-sm outline-none ring-foreground/30 focus-visible:ring-4"
					initial={false}
					animate={{ left: `${percent}%` }}
					transition={springSnappy}
				/>
			</div>

			<div
				id={labelId}
				className="mt-3 flex items-center justify-between font-semibold text-foreground text-xs uppercase tracking-wide"
			>
				<span>100 students</span>
				<span>Unlimited students</span>
			</div>
		</div>
	);
}
