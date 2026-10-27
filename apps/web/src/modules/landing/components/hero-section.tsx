"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { dicebearUrl, docsHref, HERO_AVATARS } from "../data/landing.data";
import { AttendanceWalkthrough } from "./attendance-walkthrough";
import { FadeIn } from "./fade-in";
import { MeshCanvas } from "./mesh-canvas";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function HeroSection() {
	return (
		<section className="w-full overflow-hidden px-4 py-16 sm:px-8">
			<div className="mx-auto w-full max-w-5xl">
				<div className="mx-auto max-w-3xl text-center">
					<motion.span
						initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						transition={{ duration: 0.7, ease: EASE }}
						className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card py-1.5 pr-4 pl-1.5 font-medium text-foreground text-sm shadow-sm"
					>
						<span className="flex">
							{HERO_AVATARS.map((avatar) => (
								// oxlint-disable-next-line nextjs/no-img-element -- external dicebear avatar SVG, not optimizable via next/image
								<img
									key={avatar.seed}
									src={dicebearUrl(avatar.seed)}
									alt=""
									aria-hidden="true"
									className="-ml-2 size-5 rounded-full ring-2 ring-card first:ml-0"
									loading="eager"
								/>
							))}
						</span>
						Built for Aga Khan Schools & similar networks
					</motion.span>

					<motion.h1
						initial={{ opacity: 0, y: 24, filter: "blur(10px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
						className="mt-6 text-balance font-serif text-3xl leading-[1.12] tracking-tight sm:text-5xl"
					>
						<span className="text-foreground">Peace of mind for parents.</span>
						<br />
						<span className="text-primary">Proof for schools.</span>
					</motion.h1>

					<motion.p
						initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						transition={{ duration: 0.8, delay: 0.16, ease: EASE }}
						className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted-foreground leading-7"
					>
						Watch the full loop — scan a student QR, mark present, alert parents on WhatsApp, and
						update the principal dashboard live.
					</motion.p>

					<motion.div
						initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
						animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
						transition={{ duration: 0.8, delay: 0.24, ease: EASE }}
						className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
					>
						<motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
							<Link
								href="#product"
								className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
							>
								See the demo
							</Link>
						</motion.div>
						<motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.98 }}>
							<Link
								href={docsHref()}
								className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-base font-medium text-foreground transition-colors hover:bg-secondary sm:w-auto"
							>
								Read the docs
							</Link>
						</motion.div>
					</motion.div>
				</div>

				<FadeIn
					delay={0.2}
					className="relative mt-14 min-h-[32rem] overflow-hidden rounded-3xl border border-border/70 p-4 sm:min-h-[34rem] sm:p-6"
					y={0}
				>
					<div className="absolute inset-0 size-full overflow-hidden">
						<MeshCanvas intensity={0.3} palette="teal" speed={0.22} />
					</div>
					<div className="relative pt-2 sm:pt-4">
						<AttendanceWalkthrough />
					</div>
				</FadeIn>
			</div>
		</section>
	);
}
