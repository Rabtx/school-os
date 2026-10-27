import { expect, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: select", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/select");
		await expect(page.getByRole("heading", { name: "Select", level: 1 })).toBeVisible();
	});

	test("the label names it, the hint describes it and a choice sets the value", async ({
		page,
	}) => {
		const select = page.getByLabel("Team");
		await expect(select).toHaveAccessibleDescription("Who owns this project.");
		await select.selectOption("engineering");
		await expect(select).toHaveValue("engineering");
	});

	test("the placeholder is muted until an option is chosen", async ({ page }) => {
		const select = page.getByLabel("Team");
		const color = () => select.evaluate((el) => getComputedStyle(el).color);
		await expect(select).toHaveValue("");
		const muted = await color();
		await select.selectOption("design");
		expect(await color()).not.toBe(muted);
	});

	test("heights match the spec", async ({ page }) => {
		const heights = await Promise.all(
			["sm", "md", "lg"].map((name) =>
				page
					.getByRole("combobox", { name, exact: true })
					.locator("xpath=..")
					.evaluate((el) => el.getBoundingClientRect().height),
			),
		);
		expect(heights).toEqual([28, 32, 36]);
	});

	test("clicking opens the list with 28px rows and Escape closes it", async ({ page }) => {
		const select = page.getByLabel("Team");
		await select.click();
		const option = page.getByRole("option", { name: "Engineering" });
		await expect(option).toBeVisible();
		expect((await option.boundingBox())?.height).toBe(28);
		await option.click();
		await expect(select).toHaveValue("engineering");
		await select.click();
		await page.keyboard.press("Escape");
		await expect(page.getByRole("option", { name: "Design" })).toBeHidden();
	});

	test("an error turns the edge red and a disabled select is disabled", async ({ page }) => {
		const invalid = page.getByLabel("Plan");
		await expect(invalid).toHaveAttribute("aria-invalid", "true");
		await expect(invalid).toHaveAccessibleDescription("Choose a plan to continue.");
		await expect(invalid.locator("xpath=..")).toHaveCSS("--rx-edge-a", "rgb(229, 72, 77)");
		await expect(page.getByLabel("Region")).toBeDisabled();
	});

	test("focus turns the edge blue and Flat is one border color", async ({ page }) => {
		const select = page.getByLabel("Team");
		const wrapper = select.locator("xpath=..");
		await select.focus();
		await expect(wrapper).toHaveCSS("--rx-edge-a", "rgb(45, 124, 246)");
		await select.blur();
		const edges = () =>
			wrapper.evaluate((el) => {
				const style = getComputedStyle(el);
				return [style.getPropertyValue("--rx-edge-a"), style.getPropertyValue("--rx-edge-b")];
			});
		const [floatingA, floatingB] = await edges();
		expect(floatingA).not.toBe(floatingB);
		await mode(page, "flat").click();
		const [flatA, flatB] = await edges();
		expect(flatA).toBe(flatB);
	});
});
