import { expect, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: card", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/card");
		await expect(page.getByRole("heading", { name: "Card", level: 1 })).toBeVisible();
	});

	test("padding is 12, 16 and 20 including the border", async ({ page }) => {
		const offsets = await Promise.all(
			["sm", "md", "lg"].map((name) =>
				page
					.getByText(name, { exact: true })
					.locator("xpath=..")
					.evaluate((card) => {
						const child = card.firstElementChild as HTMLElement;
						return child.getBoundingClientRect().left - card.getBoundingClientRect().left;
					}),
			),
		);
		expect(offsets).toEqual([12, 16, 20]);
	});

	test("the radius follows the box tier in every mode", async ({ page }) => {
		const card = page.getByRole("heading", { name: "Invite your team" }).locator("xpath=../..");
		const radius = () => card.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
		expect(await radius()).toBe("12px");
		await mode(page, "sharp").click();
		expect(await radius()).toBe("4px");
		await mode(page, "round").click();
		expect(await radius()).toBe("20px");
	});

	test("Flat is one border color and does not move the layout", async ({ page }) => {
		const card = page.getByRole("heading", { name: "Invite your team" }).locator("xpath=../..");
		const edges = () =>
			card.evaluate((el) => {
				const style = getComputedStyle(el);
				return [style.getPropertyValue("--rx-edge-a"), style.getPropertyValue("--rx-edge-b")];
			});
		const before = await card.boundingBox();
		const [floatingA, floatingB] = await edges();
		expect(floatingA).not.toBe(floatingB);
		await mode(page, "flat").click();
		const [flatA, flatB] = await edges();
		expect(flatA).toBe(flatB);
		expect(await card.boundingBox()).toEqual(before);
	});

	test("a card does not react to hover or press like a control", async ({ page }) => {
		const card = page.getByRole("heading", { name: "Invite your team" }).locator("xpath=../..");
		const before = await card.evaluate((el) => getComputedStyle(el).getPropertyValue("--rx-fill"));
		await card.hover();
		await page.mouse.down();
		expect(await card.evaluate((el) => getComputedStyle(el).scale)).toBe("none");
		expect(await card.evaluate((el) => getComputedStyle(el).getPropertyValue("--rx-fill"))).toBe(
			before,
		);
		await page.mouse.up();
	});
});
