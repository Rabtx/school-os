"use client";

import { SecurityCheckIcon, Tick02Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { motion, useReducedMotion } from "motion/react";
import { DEMO_PARENT, DEMO_STUDENT, dicebearUrl } from "../data/landing.data";
import { ATLAS_EASE, springSnappy } from "../lib/motion";
import { cn } from "../lib/utils";
import { DemoGlassCard } from "./demo-glass-card";

const CONSENT_STEPS = [
	{ id: "opt-in", label: "Guardian opt-in", detail: `${DEMO_PARENT.name} · WhatsApp verified` },
	{ id: "template", label: "Utility template", detail: "arrival_safe · transactional only" },
	{ id: "quiet", label: "Quiet hours", detail: "10 PM – 7 AM · no marketing" },
] as const;

export function FaqConsentDemo() {
	const reduceMotion = useReducedMotion();

	return (
		<DemoGlassCard variant="panel" innerClassName="p-4 sm:p-5">
			<div className="flex items-start gap-3">
				{/* oxlint-disable-next-line nextjs/no-img-element -- external dicebear avatar SVG, not optimizable via next/image */}
				<img
					src={dicebearUrl(DEMO_PARENT.seed)}
					alt=""
					className="size-10 shrink-0 rounded-full bg-muted ring-1 ring-border/60"
				/>
				<div className="min-w-0 flex-1">
					<p className="font-medium text-foreground text-sm">{DEMO_PARENT.name}</p>
					<p className="text-muted-foreground text-xs">
						{DEMO_PARENT.relation} of {DEMO_STUDENT.name} · Class {DEMO_STUDENT.class}
					</p>
				</div>
				<span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-medium text-[10px] text-primary">
					<HugeiconsIcon icon={SecurityCheckIcon} className="size-3" aria-hidden={true} />
					Opted in
				</span>
			</div>

			<ul className="mt-4 space-y-2">
				{CONSENT_STEPS.map((step, index) => (
					<motion.li
						key={step.id}
						className="flex items-start gap-2.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5"
						initial={reduceMotion ? false : { opacity: 0, x: -8 }}
						whileInView={{ opacity: 1, x: 0 }}
						viewport={{ once: true, amount: 0.6 }}
						transition={{ duration: 0.4, delay: index * 0.08, ease: ATLAS_EASE }}
					>
						<span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
							<HugeiconsIcon
								icon={Tick02Icon}
								className="size-3"
								strokeWidth={2.5}
								aria-hidden={true}
							/>
						</span>
						<div className="min-w-0">
							<p className="font-medium text-foreground text-xs">{step.label}</p>
							<p className="mt-0.5 text-[11px] text-muted-foreground leading-5">{step.detail}</p>
						</div>
					</motion.li>
				))}
			</ul>

			<motion.div
				className={cn(
					"mt-4 flex items-start gap-2 rounded-xl bg-primary/10 px-3 py-2.5 ring-1 ring-primary/20",
				)}
				initial={reduceMotion ? false : { opacity: 0, y: 6 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={springSnappy}
			>
				<HugeiconsIcon
					icon={WhatsappIcon}
					className="mt-0.5 size-4 shrink-0 text-[#25D366]"
					aria-hidden={true}
				/>
				<p className="text-[11px] text-foreground leading-5 sm:text-xs">
					✓ {DEMO_STUDENT.name} arrived safely at {DEMO_STUDENT.campus} · {DEMO_STUDENT.time}
				</p>
			</motion.div>
		</DemoGlassCard>
	);
}
