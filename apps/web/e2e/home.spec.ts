import { expect, test } from "@playwright/test";

test("home page redirects to the landing hero", async ({ page }) => {
	await page.goto("/");
	await expect(page).toHaveURL(/\/landing$/);
	await expect(
		page.getByRole("heading", { level: 1, name: /Peace of mind for parents/i }),
	).toBeVisible();
});
