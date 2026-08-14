import { test, expect } from "@playwright/test";

test("submitting feedback shows a confirmation", async ({ page }) => {
  await page.goto("/en/feedback");

  await page.fill("[name=content]", `Automated feedback test ${Date.now()}`);
  await page.getByRole("button", { name: "Send feedback" }).click();

  await expect(page.getByText(/in my inbox now/)).toBeVisible();
});

test("submitting whitespace-only feedback shows an error instead of a silent no-op", async ({
  page,
}) => {
  await page.goto("/en/feedback");

  // The textarea's `required` attribute only rejects a truly empty
  // submission client-side — whitespace passes that check and reaches
  // submitFeedback()'s own server-side .trim() guard instead.
  await page.fill("[name=content]", "   ");
  await page.getByRole("button", { name: "Send feedback" }).click();

  await expect(page.getByText(/can't be empty/)).toBeVisible();
});
