import { expect, type Page, test } from "@playwright/test";

// The radios are visually hidden, so click their labels the way a person does.
const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: button", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/button");
		await expect(page.getByRole("heading", { name: "Button", level: 1 })).toBeVisible();
	});

	test("the toggles set the modes on the wrapper", async ({ page }) => {
		const wrapper = page.locator("[data-theme]");
		await mode(page, "dark").click();
		await mode(page, "flat").click();
		await mode(page, "round").click();
		await mode(page, "off").click();
		await expect(wrapper).toHaveAttribute("data-theme", "dark");
		await expect(wrapper).toHaveAttribute("data-depth", "flat");
		await expect(wrapper).toHaveAttribute("data-radius", "round");
		await expect(wrapper).toHaveAttribute("data-motion", "off");
	});

	test("Flat is one border color and does not move the layout", async ({ page }) => {
		const button = page.getByRole("button", { name: "Primary" });
		const edges = () =>
			button.evaluate((el) => {
				const style = getComputedStyle(el);
				return [style.getPropertyValue("--rx-edge-a"), style.getPropertyValue("--rx-edge-b")];
			});
		const before = await button.boundingBox();
		const [floatingA, floatingB] = await edges();
		expect(floatingA).not.toBe(floatingB);

		await mode(page, "flat").click();
		const [flatA, flatB] = await edges();
		expect(flatA).toBe(flatB);
		expect(await button.boundingBox()).toEqual(before);
	});

	test("keyboard focus shows a 2px ring", async ({ page }) => {
		const button = page.getByRole("button", { name: "Primary" });
		await button.focus();
		await page.keyboard.press("Tab");
		await page.keyboard.press("Shift+Tab");
		await expect(button).toBeFocused();
		await expect(button).toHaveCSS("outline-width", "2px");
	});

	test("loading sets aria-busy and keeps the width", async ({ page }) => {
		const button = page.getByRole("button", { name: "Save changes" });
		const before = await button.boundingBox();
		await button.click();
		await expect(button).toHaveAttribute("aria-busy", "true");
		expect((await button.boundingBox())?.width).toBe(before?.width);
	});

	test("the example source is shown and the page fits a phone", async ({ page }) => {
		await expect(page.getByText('variant="ghost"').first()).toBeAttached();
		await page.setViewportSize({ width: 375, height: 812 });
		const { scrollWidth, clientWidth } = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
		}));
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
	});
});
