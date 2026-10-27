import { expect, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: checkbox", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/checkbox");
		await expect(page.getByRole("heading", { name: "Checkbox", level: 1 })).toBeVisible();
	});

	test("the label names it and clicking the text toggles it", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Share anonymous usage data" });
		await expect(box).not.toBeChecked();
		await page.locator("label", { hasText: "Share anonymous usage data" }).click();
		await expect(box).toBeChecked();
		await box.press("Space");
		await expect(box).not.toBeChecked();
	});

	test("the box is 16px, accent when on and white when off", async ({ page }) => {
		const on = page.getByRole("checkbox", { name: "Email me product updates" });
		const off = page.getByRole("checkbox", { name: "Share anonymous usage data" });
		expect(await on.boundingBox()).toMatchObject({ width: 16, height: 16 });
		await expect(on).toHaveCSS("background-color", "rgb(45, 124, 246)");
		await expect(off).toHaveCSS("background-color", "rgb(255, 255, 255)");
	});

	test("the click area reaches 24px around the box", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Email me product updates" });
		const rect = await box.boundingBox();
		if (!rect) throw new Error("no box");
		await page.mouse.click(rect.x - 3, rect.y + 8);
		await expect(box).not.toBeChecked();
	});

	test("a disabled checkbox cannot be toggled", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Beta features (not available)" });
		await expect(box).toBeDisabled();
		await page
			.locator("label", { hasText: "Beta features (not available)" })
			.click({ force: true });
		await expect(box).not.toBeChecked();
	});

	test("select all is mixed, then checked, then clear", async ({ page }) => {
		const all = page.getByRole("checkbox", { name: "All teams" });
		const mixed = () => all.evaluate((el: HTMLInputElement) => el.indeterminate);
		await expect.poll(mixed).toBe(true);
		await all.click();
		await expect(all).toBeChecked();
		expect(await mixed()).toBe(false);
		await all.click();
		await expect(all).not.toBeChecked();
		await page.getByRole("checkbox", { name: "Growth" }).click();
		await expect.poll(mixed).toBe(true);
	});

	test("keyboard focus shows a 2px ring", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Share anonymous usage data" });
		await box.focus();
		await page.keyboard.press("Tab");
		await page.keyboard.press("Shift+Tab");
		await expect(box).toBeFocused();
		await expect(box).toHaveCSS("outline-width", "2px");
	});

	test("the radius follows the checkbox tier and Round stays a square", async ({ page }) => {
		const box = page.getByRole("checkbox", { name: "Share anonymous usage data" });
		const radius = () => box.evaluate((el) => getComputedStyle(el).borderTopLeftRadius);
		expect(await radius()).toBe("4px");
		await mode(page, "sharp").click();
		expect(await radius()).toBe("2px");
		await mode(page, "round").click();
		expect(await radius()).toBe("6px");
	});
});
