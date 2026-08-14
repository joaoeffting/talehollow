import { type Page, test, expect } from "@playwright/test";
import { getOwnUsername, dragViaPointer } from "./helpers";

async function addExternalBook(
  page: Page,
  { title, buyUrl }: { title: string; buyUrl: string },
) {
  // The toggle button that opens the form says "Add a book"; the form's
  // own submit button (SaveWithLoading) says "Add book" — different
  // strings, not a typo to fix here.
  await page.getByRole("button", { name: "Add a book" }).click();
  await page.fill('input[name="title"]', title);
  await page.fill('input[name="buy_url"]', buyUrl);
  await page.getByRole("button", { name: "Add book", exact: true }).click();
  await expect(page.getByText(title)).toBeVisible();
}

// aria-label on each drag handle is `Reorder "<title>"` — reading these off
// in DOM order is a simpler way to assert list order than diffing classed
// divs, and happens to double as proof the handles themselves render.
async function externalBookOrder(page: Page): Promise<string[]> {
  const handles = await page.getByRole("button", { name: /^Reorder "/ }).all();
  const labels = await Promise.all(
    handles.map((h) => h.getAttribute("aria-label")),
  );
  return labels.map((label) => label!.replace(/^Reorder "|"$/g, ""));
}

test("adding, drag-reordering, and removing external books", async ({
  page,
}) => {
  const runId = Date.now();
  const bookA = `External book A ${runId}`;
  const bookB = `External book B ${runId}`;

  const username = await getOwnUsername(page);
  await page.goto(`/en/u/${username}`);

  await addExternalBook(page, { title: bookA, buyUrl: "https://amazon.com/a" });
  await addExternalBook(page, { title: bookB, buyUrl: "https://amazon.com/b" });

  await expect.poll(() => externalBookOrder(page)).toEqual([bookA, bookB]);

  // Pointer drag, not keyboard — this page also renders a Base UI Tabs
  // widget (Books/Scrapbook/Saved) alongside this list, and reordering via
  // arrow keys turned out unreliable here too, the same way it's reliably
  // broken on the Accordion-wrapped chapter list (see chapter-reorder.spec.ts
  // and dragViaPointer's note in helpers.ts).
  await dragViaPointer(page, `Reorder "${bookA}"`, `Reorder "${bookB}"`);
  await expect.poll(() => externalBookOrder(page)).toEqual([bookB, bookA]);

  // dnd-kit's drop animation (the row easing into its final position) is a
  // CSS transition, not a network request — waitForLoadState("networkidle")
  // doesn't wait for it. Clicking a delete button while a row is still
  // physically settling can hit Playwright's own actionability retry (the
  // element moves between its stability checks), which can dispatch the
  // click twice and fire window.confirm() twice for one page.once()
  // handler — surfacing as "Cannot accept dialog which is already
  // handled!" rather than anything actually wrong with the delete itself.
  await page.waitForTimeout(400);

  // Clean up both — this test creates its own data, so it's the only
  // thing responsible for removing it again. Waiting for the whole page's
  // revalidatePath-driven re-render to settle before the next iteration
  // avoids the same kind of mid-transition click landing on a DOM node
  // that's about to be replaced by the previous deletion's own re-render.
  for (const title of [bookA, bookB]) {
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: `Remove "${title}"` }).click();
    await expect(page.getByText(title)).not.toBeVisible();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
  }
});
