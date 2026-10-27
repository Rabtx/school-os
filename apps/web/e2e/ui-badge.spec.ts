import { expect, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

const luminance = (rgb: number[]) => {
	const [r, g, b] = rgb.map((v) => {
		const c = v / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast of every badge's text on its own fill. The browser resolves the colors. */
const contrasts = async (page: Page) => {
	const badges = await page.locator("main span.rx-tint").evaluateAll((nodes) => {
		const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
		if (!ctx) throw new Error("no canvas");
		return nodes.map((node) => {
			const style = getComputedStyle(node);
			const [text, fill] = [style.color, style.backgroundColor].map((css) => {
				ctx.fillStyle = css;
				ctx.clearRect(0, 0, 1, 1);
				ctx.fillRect(0, 0, 1, 1);
				return Array.from(ctx.getImageData(0, 0, 1, 1).data.slice(0, 3));
			});
			return { name: node.textContent ?? "", text, fill };
		});
	});
	return badges.map(({ name, text, fill }) => {
		const [a, b] = [luminance(text), luminance(fill)];
		return [name, (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)] as const;
	});
};

test.describe("rabtx docs: badge", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/badge");
		await expect(page.getByRole("heading", { name: "Badge", level: 1 })).toBeVisible();
	});

	test("a badge is 20px tall", async ({ page }) => {
		const box = await page.getByText("neutral", { exact: true }).first().boundingBox();
		expect(box?.height).toBe(20);
	});

	test("the radius follows the badge tier in every mode", async ({ page }) => {
		const badge = page.getByText("accent", { exact: true }).first();
		const radius = () => badge.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
		expect(await radius()).toBe("4px");
		await mode(page, "sharp").click();
		expect(await radius()).toBe("2px");
		await mode(page, "round").click();
		expect(Number.parseFloat(await radius())).toBeGreaterThanOrEqual(10);
	});

	test("every tone passes 4.5:1 in light and in dark", async ({ page }) => {
		const light = await contrasts(page);
		expect(light.length).toBeGreaterThanOrEqual(9);
		for (const [name, ratio] of light) expect(ratio, `light ${name}`).toBeGreaterThanOrEqual(4.5);

		await mode(page, "dark").click();
		const dark = await contrasts(page);
		for (const [name, ratio] of dark) expect(ratio, `dark ${name}`).toBeGreaterThanOrEqual(4.5);
	});

	test("the dot is hidden from assistive technology", async ({ page }) => {
		const dot = page.getByText("Active", { exact: true }).locator("span");
		await expect(dot).toHaveAttribute("aria-hidden", "true");
	});
});
