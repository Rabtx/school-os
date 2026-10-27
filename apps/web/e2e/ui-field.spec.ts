import { expect, test } from "@playwright/test";

test.describe("rabtx docs: field", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/ui/field");
		await expect(page.getByRole("heading", { name: "Field", level: 1 })).toBeVisible();
	});

	test("the label names the control and the hint describes it", async ({ page }) => {
		const input = page.getByLabel("Workspace name");
		await expect(input).toHaveAccessibleDescription("You can change this later.");
		await page.getByText("Workspace name", { exact: true }).click();
		await expect(input).toBeFocused();
	});

	test("an error replaces the hint, marks the control invalid and turns the edge red", async ({
		page,
	}) => {
		const input = page.getByLabel("Work email");
		await expect(input).toHaveAttribute("aria-invalid", "true");
		await expect(input).toHaveAccessibleDescription("Enter a valid email address.");
		await expect(input.locator("xpath=..")).toHaveCSS("--rx-edge-a", "rgb(229, 72, 77)");
	});

	test("each field gets its own id", async ({ page }) => {
		const ids = await page.locator("main input").evaluateAll((inputs) => inputs.map((i) => i.id));
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids.every(Boolean)).toBe(true);
	});
});
