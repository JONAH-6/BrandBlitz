import { expect, test } from "@playwright/test";
import { signInWithMockGoogle } from "./helpers";

test("brand can create a brand kit and see deposit instructions", async ({ page }) => {
  await signInWithMockGoogle(
    page,
    { email: "brand-owner@example.com", name: "Brand Owner" },
    "/brand/new"
  );

  await page.waitForURL("**/brand/new");
  await expect(page.getByRole("heading", { name: "Create Brand Kit" })).toBeVisible();

  await page.getByLabel("Brand Name *").fill("Nova Reach");
  await page.getByLabel("Tagline").fill("Earned attention, not empty impressions");
  await page
    .getByLabel("Brand Story")
    .fill("Nova Reach helps web3 brands turn curiosity into measurable recall.");
  await page.getByLabel("Prize Pool (USDC) *").fill("50");
  await page.getByLabel("Challenge Duration (hours)").fill("24");

  await page.getByRole("button", { name: "Create Brand Kit & Challenge" }).click();

  await expect(page.getByRole("heading", { name: "Deposit Instructions" })).toBeVisible();
  await expect(page.getByText(/Address:/)).toBeVisible();
  await expect(page.getByText(/Memo:/)).toBeVisible();
});

test("submit button only fires one POST request on double-click", async ({ page, request }) => {
  const posts: string[] = [];
  request.on("request", (msg) => {
    if (msg.method() === "POST") {
      posts.push(msg.url());
    }
  });

  await signInWithMockGoogle(
    page,
    { email: "doubleclick@example.com", name: "Double Click" },
    "/brand/new"
  );

  await page.waitForURL("**/brand/new");

  await page.getByLabel("Brand Name *").fill("Test Brand");
  await page.getByLabel("Prize Pool (USDC) *").fill("50");

  const submitBtn = page.getByRole("button", { name: "Create Brand Kit & Challenge" });
  await submitBtn.dblclick();

  await page.waitForURL("**/brand/*");
  await expect(page.getByRole("heading", { name: "Deposit Instructions" })).toBeVisible();

  const brandPosts = posts.filter((p) => p.includes("/brands"));
  expect(brandPosts).toHaveLength(1);
});

test("brand dashboard shows a toast when the brands API is down", async ({ page }) => {
  await page.route("**/api/brands", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Temporary outage" }),
      });
      return;
    }

    await route.continue();
  });

  await signInWithMockGoogle(
    page,
    { email: "dashboard-failure@example.com", name: "Dashboard Failure" },
    "/brand/dashboard"
  );

  await page.waitForURL("**/brand/dashboard");

  await expect(page.getByRole("heading", { name: "Couldn't load brands" })).toBeVisible();
  await expect(page.getByText("Couldn't load brands. Please try again.")).toBeVisible();
});
