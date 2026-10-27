import { expect, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: input", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/input");
		await expect(page.getByRole("heading", { name: "Input", level: 1 })).toBeVisible();
	});

	test("the label names the input and typing works", async ({ page }) => {
		const input = page.getByLabel("Email", { exact: true }).first();
		await input.fill("a@b.co");
		await expect(input).toHaveValue("a@b.co");
	});

	test("clicking an icon focuses the input and shows the focus edge", async ({ page }) => {
		const input = page.getByRole("textbox", { name: "Email" }).nth(1);
		await input.locator("xpath=preceding-sibling::span").click();
		await expect(input).toBeFocused();
		const wrapper = input.locator("xpath=..");
		await expect(wrapper).toHaveCSS("--rx-edge-a", "rgb(45, 124, 246)");
	});

	test("an invalid input turns the edge red and a disabled one is disabled", async ({ page }) => {
		const invalid = page.locator('input[aria-invalid="true"]');
		await expect(invalid.locator("xpath=..")).toHaveCSS("--rx-edge-a", "rgb(229, 72, 77)");
		await expect(page.getByRole("textbox", { name: "Workspace" })).toBeDisabled();
	});

	test("Flat is one border color and Floating is recessed", async ({ page }) => {
		const wrapper = page.getByRole("textbox", { name: "md" }).locator("xpath=..");
		const edges = () =>
			wrapper.evaluate((el) => {
				const style = getComputedStyle(el);
				return [style.getPropertyValue("--rx-edge-a"), style.getPropertyValue("--rx-edge-b")];
			});
		const before = await wrapper.boundingBox();
		const [floatingA, floatingB] = await edges();
		expect(floatingA).not.toBe(floatingB);
		await mode(page, "flat").click();
		const [flatA, flatB] = await edges();
		expect(flatA).toBe(flatB);
		expect(await wrapper.boundingBox()).toEqual(before);
	});

	test("heights match the spec", async ({ page }) => {
		const heights = await Promise.all(
			["sm", "md", "lg", "xl", "2xl"].map((name) =>
				page
					.getByRole("textbox", { name, exact: true })
					.locator("xpath=..")
					.evaluate((el) => el.getBoundingClientRect().height),
			),
		);
		expect(heights).toEqual([28, 32, 36, 44, 48]);
	});
});
