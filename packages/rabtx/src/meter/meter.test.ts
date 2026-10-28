import { describe, expect, it } from "vitest";
import { meterTicks, trendBars } from "./meter.styles";

describe("meterTicks", () => {
	it("fills the share of 20 ticks, red to amber to green", () => {
		const ticks = meterTicks(96);
		expect(ticks).toHaveLength(20);
		expect(ticks.filter((tick) => tick.filled)).toHaveLength(19);
		expect(ticks[0]?.color).toBe("var(--rx-danger)");
		expect(ticks[5]?.color).toBe("var(--rx-warning)");
		expect(ticks[10]?.color).toBe("var(--rx-success)");
		expect(ticks[19]?.color).toBe("var(--rx-border-strong)");
	});

	it("fills nothing for null and clamps out-of-range rates", () => {
		expect(meterTicks(null).some((tick) => tick.filled)).toBe(false);
		expect(meterTicks(140).every((tick) => tick.filled)).toBe(true);
		expect(meterTicks(-5).some((tick) => tick.filled)).toBe(false);
	});
});

describe("trendBars", () => {
	it("keeps a minimum height and reads red under the threshold", () => {
		const bars = trendBars(
			[
				{ label: "Mon", rate: 90 },
				{ label: "Tue", rate: 5 },
			],
			85,
		);
		expect(bars.map((bar) => bar.height)).toEqual(["90%", "15%"]);
		expect(bars.map((bar) => bar.color)).toEqual(["var(--rx-success)", "var(--rx-danger)"]);
		expect(bars[1]?.label).toBe("Tue: 5%");
	});
});
