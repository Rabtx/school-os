/**
 * Springs are defined once, as stiffness, damping and mass, so web and native can share the numbers.
 * On the web each spring is solved here into a CSS `linear()` easing (see `scripts/generate-springs.ts`);
 * native passes the same three numbers to its spring API.
 */
export type Spring = {
	stiffness: number;
	damping: number;
	mass: number;
};

/** beUI values, kept as the reference feel. */
export const SPRINGS = {
	/** Press feedback: scale 0.93, settles in about 280ms. */
	press: { stiffness: 500, damping: 30, mass: 0.6 },
	/** Icon, label and shape swaps. About 5% overshoot. */
	swap: { stiffness: 460, damping: 30, mass: 1 },
	/** Sliding indicator. Slightly overdamped, no overshoot. */
	tabs: { stiffness: 245, damping: 36, mass: 1.2 },
	/** Dialogs and sheets. */
	panel: { stiffness: 420, damping: 40, mass: 0.5 },
	toast: { stiffness: 420, damping: 34, mass: 0.75 },
	/** Switch thumb. Heavy, squishes to 0.9. */
	switch: { stiffness: 800, damping: 80, mass: 4 },
} as const satisfies Record<string, Spring>;

export type SpringName = keyof typeof SPRINGS;

/** Damping ratio: below 1 the spring overshoots, at or above 1 it does not. */
export function dampingRatio({ stiffness, damping, mass }: Spring): number {
	return damping / (2 * Math.sqrt(stiffness * mass));
}

/** Position over time (seconds) for a spring released at 0 with target 1 and no initial velocity. */
export function springStep(spring: Spring, t: number): number {
	const { stiffness, mass } = spring;
	const w0 = Math.sqrt(stiffness / mass);
	const z = dampingRatio(spring);
	if (z < 1) {
		const wd = w0 * Math.sqrt(1 - z * z);
		return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
	}
	if (z === 1) {
		return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
	}
	const s = Math.sqrt(z * z - 1);
	const r1 = -w0 * (z - s);
	const r2 = -w0 * (z + s);
	return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
}

export type SolvedSpring = {
	/** Time until the spring stays within `epsilon` of its target. */
	settleMs: number;
	/** Peak above the target, as a percentage of the travelled distance. */
	overshootPercent: number;
	/** A CSS `linear()` easing that reproduces the spring over `settleMs`. */
	easing: string;
};

const POINTS = 44;
const EPSILON = 0.002;

/** Solve a spring into a CSS easing. The easing is a fixed curve; it carries no velocity on interruption. */
export function solveSpring(spring: Spring): SolvedSpring {
	let settle = 0;
	for (let t = 0; t < 5; t += 0.001) {
		if (Math.abs(springStep(spring, t) - 1) > EPSILON) settle = t;
	}
	settle += 0.004;

	const samples = Array.from({ length: POINTS }, (_, i) =>
		i === POINTS - 1 ? 1 : springStep(spring, (settle * i) / (POINTS - 1)),
	);
	const peak = Math.max(...samples);
	const easing = `linear(${samples.map(formatSample).join(", ")})`;

	return {
		settleMs: Math.round(settle * 1000),
		overshootPercent: Math.round((peak - 1) * 10000) / 100,
		easing,
	};
}

function formatSample(value: number): string {
	if (value === 0 || value === 1) return String(value);
	const text = value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
	return text === "-0" ? "0" : text;
}

/** Spring given as a perceived duration (seconds) and bounce, converted to stiffness and damping at mass 1. */
export function springFromDuration(durationSeconds: number, bounce: number): Spring {
	const stiffness = ((2 * Math.PI) / durationSeconds) ** 2;
	return { stiffness, damping: 2 * (1 - bounce) * Math.sqrt(stiffness), mass: 1 };
}
