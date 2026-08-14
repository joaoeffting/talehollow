import { test, expect } from "@playwright/test";

// Scoped to the nav landmark specifically — the header above it also has a
// "Search" link (icon + text), which would otherwise collide with the
// bottom nav's icon-only "Search" link on accessible name alone.
test("bottom nav links navigate to the right destinations", async ({
  page,
}) => {
  await page.goto("/en");
  const nav = page.getByRole("navigation", { name: "Quick navigation" });

  await nav.getByRole("link", { name: "Search" }).click();
  await expect(page).toHaveURL(/\/en\/search$/);

  await nav.getByRole("link", { name: "New book" }).click();
  await expect(page).toHaveURL(/\/en\/dashboard\/books\/new$/);

  await nav.getByRole("link", { name: "Notifications" }).click();
  await expect(page).toHaveURL(/\/en\/notifications$/);

  await nav.getByRole("link", { name: "Home" }).click();
  await expect(page).toHaveURL(/\/en\/?$/);
});

test("the Saved link points at the signed-in user's own profile and marks itself active", async ({
  page,
}) => {
  await page.goto("/en");
  const nav = page.getByRole("navigation", { name: "Quick navigation" });
  const savedLink = nav.getByRole("link", { name: "Saved", exact: true });

  await savedLink.click();
  await expect(page).toHaveURL(/\/en\/u\/[^/]+\?tab=saved$/);
  await expect(savedLink).toHaveAttribute("aria-current", "page");
});
