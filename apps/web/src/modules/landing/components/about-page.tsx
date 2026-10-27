"use client";

import {
	ArrowUpRight01Icon,
	EyeIcon,
	HierarchyIcon,
	SecurityCheckIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@school-os/ui/components/button";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import {
	ABOUT_PRINCIPLES,
	ABOUT_TEAM,
	type AboutTeamMember,
	dicebearUrl,
	STATS,
} from "../data/landing.data";
import { ATLAS_EASE, hoverLift, springSnappy, springSoft } from "../lib/motion";
import { cn } from "../lib/utils";
import { FadeIn } from "./fade-in";

const PRINCIPLE_ICONS = {
	bridge: HierarchyIcon,
	eye: EyeIcon,
	shield: SecurityCheckIcon,
} as const;

const TONE_BG: Record<AboutTeamMember["tone"], string> = {
	green: "from-emerald-950/80 via-emerald-900/40 to-neutral-950",
	teal: "from-teal-950/80 via-teal-900/40 to-neutral-950",
	blue: "from-emerald-950/80 via-emerald-900/40 to-neutral-950",
	amber: "from-amber-950/70 via-orange-950/35 to-neutral-950",
};

export function AboutPageContent() {
	return (
		<>
			<AboutHero />
			<AboutStats />
			<AboutPrinciples />
			<AboutTeam />
		</>
	);
}

function AboutHero() {
	return (
		<section className="w-full px-4 pt-16 pb-10 sm:px-8 sm:pt-24">
			<div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
				<FadeIn>
					<span className="inline-flex items-center rounded-full border border-border bg-card px-3.5 py-1.5 font-medium text-muted-foreground text-xs">
						About School OS
					</span>
				</FadeIn>
				<FadeIn delay={0.06}>
					<h1 className="mt-6 text-balance font-serif text-4xl text-foreground leading-[1.1] tracking-tight sm:text-5xl">
						The trust engine for schools — built to ship.
					</h1>
				</FadeIn>
				<FadeIn delay={0.12}>
					<p className="mt-6 max-w-2xl text-pretty text-muted-foreground text-base leading-8 sm:text-lg">
						School OS gives institutional school networks — including Aga Khan Schools — a
						mobile-first way to prove student safety, keep parents informed on WhatsApp, and grow
						admissions on a production-grade platform teams can extend.
					</p>
				</FadeIn>
			</div>
		</section>
	);
}

function AboutStats() {
	return (
		<section className="w-full px-4 py-16 sm:px-8 sm:py-24">
			<div className="mx-auto w-full max-w-5xl">
				<div className="mx-auto max-w-2xl text-center">
					<FadeIn>
						<span className="inline-flex items-center rounded-full border border-border/60 bg-card px-3 py-1 font-medium text-muted-foreground text-xs">
							At a glance
						</span>
					</FadeIn>
					<FadeIn delay={0.08}>
						<h2 className="mt-5 text-balance font-serif text-3xl text-foreground leading-tight sm:text-4xl">
							Built for schools that live on WhatsApp.
						</h2>
					</FadeIn>
				</div>

				<div className="mt-14 grid grid-cols-2 gap-8 sm:gap-10 lg:grid-cols-4">
					{STATS.map((stat, index) => (
						<FadeIn key={stat.label} delay={index * 0.05} className="text-center">
							<p className="font-medium text-4xl text-foreground tabular-nums tracking-tight sm:text-5xl">
								{stat.display ?? `${stat.prefix}${stat.value}${stat.suffix}`}
							</p>
							<p className="mt-3 font-medium text-foreground text-sm">{stat.label}</p>
							{stat.detail ? (
								<p className="mt-1 text-muted-foreground text-xs">{stat.detail}</p>
							) : null}
						</FadeIn>
					))}
				</div>
			</div>
		</section>
	);
}

function AboutPrinciples() {
	return (
		<section className="w-full px-4 py-16 sm:px-8 sm:py-24">
			<div className="mx-auto w-full max-w-5xl">
				<FadeIn>
					<h2 className="max-w-xl text-balance font-serif text-3xl text-foreground leading-tight sm:text-4xl">
						The principles we won&apos;t compromise on.
					</h2>
				</FadeIn>

				<div className="mt-10 grid gap-4 md:grid-cols-3">
					{ABOUT_PRINCIPLES.map((principle, index) => {
						const icon = PRINCIPLE_ICONS[principle.icon];
						return (
							<FadeIn key={principle.title} delay={index * 0.06} y={28}>
								<motion.article
									className="flex h-full flex-col rounded-3xl border border-border/60 bg-card/40 p-6"
									whileHover={hoverLift}
									transition={springSnappy}
								>
									<span className="grid size-10 place-items-center rounded-2xl border border-border/60 bg-muted/40 text-foreground">
										<HugeiconsIcon
											icon={icon}
											className="size-5"
											strokeWidth={1.75}
											aria-hidden={true}
										/>
									</span>
									<h3 className="mt-5 font-medium text-foreground text-lg">{principle.title}</h3>
									<p className="mt-3 text-pretty text-muted-foreground text-sm leading-7">
										{principle.description}
									</p>
								</motion.article>
							</FadeIn>
						);
					})}
				</div>
			</div>
		</section>
	);
}

function AboutTeam() {
	const [activeId, setActiveId] = useState(ABOUT_TEAM[3]?.id ?? ABOUT_TEAM[0].id);
	const reduceMotion = useReducedMotion();

	return (
		<section className="w-full px-4 pt-16 pb-24 sm:px-8 sm:pb-32">
			<div className="mx-auto w-full max-w-5xl">
				<div className="mx-auto max-w-2xl text-center">
					<FadeIn>
						<span className="inline-flex items-center rounded-full border border-border/60 bg-card px-3 py-1 font-medium text-muted-foreground text-xs">
							Team
						</span>
					</FadeIn>
					<FadeIn delay={0.06}>
						<h2 className="mt-5 text-balance font-serif text-3xl text-foreground leading-tight sm:text-4xl">
							The people behind School OS.
						</h2>
					</FadeIn>
					<FadeIn delay={0.1}>
						<p className="mt-4 text-pretty text-muted-foreground text-sm leading-7 sm:text-base">
							Product, platform, mobile, and AI — focused on trust-first school software.
						</p>
					</FadeIn>
				</div>

				<LayoutGroup>
					<div className="mt-12 flex flex-col gap-3 lg:flex-row lg:items-stretch">
						{ABOUT_TEAM.map((member, index) => {
							const active = member.id === activeId;
							return (
								<FadeIn
									key={member.id}
									delay={index * 0.05}
									className={cn(
										"min-h-[18rem]",
										active ? "lg:basis-[38%] lg:grow" : "lg:basis-[18%] lg:grow-0 lg:shrink",
									)}
								>
									<TeamCard
										member={member}
										active={active}
										reduceMotion={!!reduceMotion}
										onSelect={() => setActiveId(member.id)}
									/>
								</FadeIn>
							);
						})}
					</div>
				</LayoutGroup>
			</div>
		</section>
	);
}

function TeamCard({
	member,
	active,
	reduceMotion,
	onSelect,
}: {
	member: AboutTeamMember;
	active: boolean;
	reduceMotion: boolean;
	onSelect: () => void;
}) {
	return (
		<motion.button
			type="button"
			layout={!reduceMotion}
			onClick={onSelect}
			onMouseEnter={onSelect}
			transition={springSoft}
			className={cn(
				"relative h-full min-h-[18rem] w-full overflow-hidden rounded-3xl border border-border/50 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring",
				"bg-gradient-to-br",
				TONE_BG[member.tone],
			)}
		>
			<AnimatePresence mode="popLayout" initial={false}>
				{active ? (
					<motion.div
						key={`${member.id}-expanded`}
						initial={reduceMotion ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.25, ease: ATLAS_EASE }}
						className="grid h-full min-h-[18rem] grid-cols-1 gap-4 p-5 sm:grid-cols-[1.1fr_0.9fr] sm:items-end"
					>
						<div className="flex flex-col justify-between gap-6">
							<p className="text-pretty text-foreground/90 text-sm leading-6">{member.bio}</p>
							<div>
								<div className="flex items-center gap-2">
									<Button
										type="button"
										variant="outline"
										size="icon"
										aria-label={`${member.name} on GitHub`}
										onClick={(event) => event.stopPropagation()}
										className="size-8 rounded-full border-white/15 bg-white/5 text-foreground/80 hover:bg-white/10 hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10"
									>
										<GitHubGlyph className="size-3.5" />
									</Button>
									<Button
										type="button"
										variant="outline"
										size="icon"
										aria-label={`${member.name} on X`}
										onClick={(event) => event.stopPropagation()}
										className="size-8 rounded-full border-white/15 bg-white/5 text-foreground/80 hover:bg-white/10 hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10"
									>
										<XGlyph className="size-3.5" />
									</Button>
									<span className="ml-1 inline-flex items-center gap-1 font-medium text-foreground text-sm">
										Profile
										<HugeiconsIcon
											icon={ArrowUpRight01Icon}
											className="size-3.5"
											aria-hidden={true}
										/>
									</span>
								</div>
								<p className="mt-4 font-medium text-foreground text-sm">{member.name}</p>
								<p className="text-muted-foreground text-xs">{member.role}</p>
							</div>
						</div>
						<div className="relative flex items-end justify-center sm:justify-end">
							{/* oxlint-disable-next-line nextjs/no-img-element -- dicebear SVG avatar */}
							<img
								src={dicebearUrl(member.seed)}
								alt=""
								aria-hidden="true"
								className="h-40 w-40 object-contain sm:h-44 sm:w-44"
								loading="lazy"
							/>
						</div>
					</motion.div>
				) : (
					<motion.div
						key={`${member.id}-compact`}
						initial={reduceMotion ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2, ease: ATLAS_EASE }}
						className="flex h-full min-h-[18rem] flex-col justify-between p-5"
					>
						<div className="flex flex-1 items-center justify-center pt-4">
							{/* oxlint-disable-next-line nextjs/no-img-element -- dicebear SVG avatar */}
							<img
								src={dicebearUrl(member.seed)}
								alt=""
								aria-hidden="true"
								className="h-28 w-28 object-contain"
								loading="lazy"
							/>
						</div>
						<div>
							<p className="font-medium text-foreground text-sm">{member.name}</p>
							<p className="text-muted-foreground text-xs">{member.role}</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.button>
	);
}

function GitHubGlyph({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
			<path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
		</svg>
	);
}

function XGlyph({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
			<path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.6l5.24 6.93 6.06-6.93Zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41Z" />
		</svg>
	);
}
