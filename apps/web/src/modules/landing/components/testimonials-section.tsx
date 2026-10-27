"use client";

import { motion } from "motion/react";
import {
	dicebearUrl,
	TESTIMONIAL_DISCLAIMER,
	TESTIMONIALS_ROW_ONE,
	TESTIMONIALS_ROW_TWO,
	type Testimonial,
} from "../data/landing.data";
import { hoverLift, springSnappy } from "../lib/motion";
import { FadeIn } from "./fade-in";
import { Marquee } from "./marquee";

export function TestimonialsSection() {
	return (
		<section id="testimonials" className="overflow-hidden px-4 py-20 sm:py-28">
			<div className="mx-auto mb-14 max-w-2xl text-center">
				<FadeIn>
					<span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
						Pilot scenarios
					</span>
				</FadeIn>
				<FadeIn delay={0.08}>
					<h2 className="mt-5 text-balance font-serif text-3xl font-medium leading-tight tracking-tight sm:text-4xl">
						Schools, teachers, and parents feel the difference.
					</h2>
				</FadeIn>
				<FadeIn delay={0.12}>
					<p className="mt-4 text-pretty text-muted-foreground text-sm leading-6">
						{TESTIMONIAL_DISCLAIMER}
					</p>
				</FadeIn>
			</div>

			<div className="flex flex-col gap-5">
				<Marquee durationSeconds={52}>
					{TESTIMONIALS_ROW_ONE.map((testimonial) => (
						<TestimonialCard key={testimonial.seed} testimonial={testimonial} />
					))}
				</Marquee>
				<Marquee durationSeconds={58} reverse>
					{TESTIMONIALS_ROW_TWO.map((testimonial) => (
						<TestimonialCard key={testimonial.seed} testimonial={testimonial} />
					))}
				</Marquee>
			</div>
		</section>
	);
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
	return (
		<motion.figure
			className="flex w-[min(100%,20rem)] max-w-[85vw] flex-col justify-between rounded-3xl border border-border/60 bg-card/50 p-5 sm:w-[380px] sm:p-6"
			whileHover={hoverLift}
			transition={springSnappy}
		>
			<blockquote className="text-pretty text-sm leading-relaxed text-foreground/90">
				“{testimonial.quote}”
			</blockquote>
			<figcaption className="mt-6 flex items-center gap-3">
				{/* oxlint-disable-next-line nextjs/no-img-element -- external dicebear avatar SVG, not optimizable via next/image */}
				<img
					src={dicebearUrl(testimonial.seed)}
					alt={testimonial.name}
					className="h-10 w-10 rounded-full border border-border/60 bg-muted"
					loading="lazy"
				/>
				<div>
					<p className="text-sm font-medium text-foreground">{testimonial.name}</p>
					<p className="text-xs text-muted-foreground">{testimonial.role}</p>
				</div>
			</figcaption>
		</motion.figure>
	);
}
