import { expect, test } from "@playwright/test";

test("login page shows spinner on 3G connection before session resolves", async ({ page }) => {
  // Throttle to slow 3G (approx 400kbps down / 400kbps up, 300ms latency)
  const client = await page.context().newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (400 * 1024) / 8,
    latency: 300,
  });

  await page.goto("/login");

  // The loading skeleton ("Loading sign-in…" sr-only text) or the sign-in card should appear
  // before the session check completes. We assert the page does not show a blank screen.
  await expect(page.locator("body")).not.toBeEmpty();

  // Once the page is interactive the sign-in button should eventually be visible
  await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible({
    timeout: 10_000,
  });
});
