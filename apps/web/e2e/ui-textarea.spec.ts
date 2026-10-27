import { expect, type Page, test } from "@playwright/test";

const mode = (page: Page, name: string) =>
	page.locator("label", { hasText: new RegExp(`^${name}$`, "i") });

test.describe("rabtx docs: textarea", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/textarea");
		await expect(page.getByRole("heading", { name: "Textarea", level: 1 })).toBeVisible();
	});

	test("the label names it, the hint describes it and typing works", async ({ page }) => {
		const textarea = page.getByLabel("Description");
		await expect(textarea).toHaveAccessibleDescription("Shown on the project page.");
		await textarea.fill("Line one\nLine two");
		await expect(textarea).toHaveValue("Line one\nLine two");
	});

	test("the minimum height is 96px", async ({ page }) => {
		const box = await page.getByLabel("Description").boundingBox();
		expect(box?.height).toBe(96);
	});

	test("focus turns the edge blue", async ({ page }) => {
		const textarea = page.getByLabel("Description");
		await textarea.focus();
		await expect(textarea).toHaveCSS("--rx-edge-a", "rgb(45, 124, 246)");
	});

	test("an error turns the edge red and a disabled one is disabled", async ({ page }) => {
		const invalid = page.getByLabel("Notes", { exact: true });
		await expect(invalid).toHaveAttribute("aria-invalid", "true");
		await expect(invalid).toHaveAccessibleDescription("Notes can be at most 200 characters.");
		await expect(invalid).toHaveCSS("--rx-edge-a", "rgb(229, 72, 77)");
		await expect(page.getByLabel("Archived notes")).toBeDisabled();
	});

	test("Flat is one border color and does not move the layout", async ({ page }) => {
		const textarea = page.getByLabel("Description");
		const edges = () =>
			textarea.evaluate((el) => {
				const style = getComputedStyle(el);
				return [style.getPropertyValue("--rx-edge-a"), style.getPropertyValue("--rx-edge-b")];
			});
		const before = await textarea.boundingBox();
		const [floatingA, floatingB] = await edges();
		expect(floatingA).not.toBe(floatingB);
		await mode(page, "flat").click();
		const [flatA, flatB] = await edges();
		expect(flatA).toBe(flatB);
		expect(await textarea.boundingBox()).toEqual(before);
	});
});
