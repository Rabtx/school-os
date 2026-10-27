import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { springsCss } from "../../scripts/generate-springs";
import { SPRINGS, dampingRatio, solveSpring, springFromDuration, springStep } from "./springs";

describe("springs", () => {
	it("starts at 0 and ends at the target", () => {
		for (const spring of Object.values(SPRINGS)) {
			expect(springStep(spring, 0)).toBeCloseTo(0, 6);
			expect(springStep(spring, 5)).toBeCloseTo(1, 4);
		}
	});

	it("tabs is overdamped and never overshoots", () => {
		expect(dampingRatio(SPRINGS.tabs)).toBeGreaterThan(1);
		const solved = solveSpring(SPRINGS.tabs);
		expect(solved.overshootPercent).toBe(0);
		expect(solved.settleMs).toBeGreaterThan(600);
		expect(solved.settleMs).toBeLessThan(750);
	});

	it("press settles quickly with a tiny overshoot", () => {
		const solved = solveSpring(SPRINGS.press);
		expect(solved.settleMs).toBeGreaterThan(250);
		expect(solved.settleMs).toBeLessThan(310);
		expect(solved.overshootPercent).toBeGreaterThan(0);
		expect(solved.overshootPercent).toBeLessThan(1);
	});

	it("swap overshoots a few percent", () => {
		const { overshootPercent } = solveSpring(SPRINGS.swap);
		expect(overshootPercent).toBeGreaterThan(3);
		expect(overshootPercent).toBeLessThan(6);
	});

	it("emits a valid linear() easing of fixed length", () => {
		const { easing } = solveSpring(SPRINGS.press);
		expect(easing.startsWith("linear(0, ")).toBe(true);
		expect(easing.endsWith(", 1)")).toBe(true);
		expect(easing.split(",").length).toBe(44);
	});

	it("converts duration and bounce into stiffness and damping", () => {
		const spring = springFromDuration(0.5, 0.25);
		expect(dampingRatio(spring)).toBeCloseTo(0.75, 6);
		expect(spring.stiffness).toBeCloseTo((2 * Math.PI) ** 2 / 0.25, 6);
	});

	it("keeps the committed springs.css in sync with the definitions", () => {
		const committed = readFileSync(new URL("../styles/springs.css", import.meta.url), "utf8");
		expect(committed).toBe(springsCss());
	});
});
