import { expect, test } from "@playwright/test";
import { signInWithMockGoogle } from "./helpers";

test("mocked Google sign in lands on the dashboard", async ({ page }) => {
  await signInWithMockGoogle(
    page,
    { email: "brand-owner-auth@example.com", name: "Brand Owner" },
    "/dashboard"
  );

  await page.waitForURL("**/dashboard");
  await expect(page.getByRole("heading", { name: "Brand Dashboard" })).toBeVisible();
});
