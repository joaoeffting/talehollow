import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createDraftBookWithChapter, publishBookAndChapter, openTableOfContentsTab } from "./helpers";

const fixtures = JSON.parse(
  fs.readFileSync(path.join(__dirname, ".auth/fixtures.json"), "utf-8"),
) as { bookId: string; chapterId: string; bookTitle: string; chapterTitle: string };

const chapterUrl = `/en/books/${fixtures.bookId}/chapters/${fixtures.chapterId}`;
const bookUrl = `/en/books/${fixtures.bookId}`;

// Tests run in the order they appear (comment/like counts from earlier tests
// carry over to later ones within the same seeded chapter) rather than in
// parallel workers, which playwright.config.ts already enforces globally
// (fullyParallel: false, workers: 1) — the `.serial` mode here just makes
// that dependency explicit and documented at the file level.
test.describe.configure({ mode: "serial" });

test("repeated visits from the same user only count one view", async ({ page }) => {
  // record_view()'s 24h window is what's supposed to keep this at exactly 1
  // as long as the three visits (like this test's) happen close together,
  // not some permanent one-time marker.
  await page.goto(chapterUrl);
  await page.goto(chapterUrl);
  await page.goto(chapterUrl);

  // The aggregate total only renders on the book page, not the chapter page.
  await page.goto(bookUrl);
  await expect(page.getByText(/\d+ views?/)).toContainText("1 view");
});

test("clicking like repeatedly never exceeds one like per user", async ({ page }) => {
  await page.goto(chapterUrl);

  const likeButton = page.getByRole("button", { name: "Like this chapter" });

  // Like, unlike, like again — toggling three times should still leave the
  // count at 1, since the underlying row only ever exists once per
  // (chapter, user) pair no matter how many times it's inserted and deleted.
  // Each click waits for its server round trip so the three toggles apply in
  // order rather than racing each other.
  await likeButton.click();
  await page.waitForLoadState("networkidle");
  await likeButton.click();
  await page.waitForLoadState("networkidle");
  await likeButton.click();
  await page.waitForLoadState("networkidle");

  await expect(likeButton).toContainText("1");
});

test("multiple comments from one user count as one commenter", async ({ page }) => {
  await page.goto(chapterUrl);

  // Post three separate comments as the same signed-in user — the total
  // comment count should reflect all three, but "people commenting" (the
  // distinct-user count) should not.
  for (const text of ["first", "second", "third"]) {
    await page.fill("[name=content]", text);
    await page.getByRole("button", { name: "Post" }).click();
    await page.waitForLoadState("networkidle");
  }

  await expect(page.getByText("Comments (3)")).toBeVisible();
  await expect(page.getByText("1 people commenting")).toBeVisible();
});

test("publishing a chapter twice in quick succession doesn't repeatedly push the feed", async ({
  page,
}) => {
  // No service-role key is configured for this project (see tests/README.md),
  // so this can't assert on books.last_pushed_at directly like a DB-level
  // test would. Instead it uses an equivalent UI-observable signal: the
  // homepage feed orders by last_pushed_at desc, so a second, near-immediate
  // publish of the seeded chapter should NOT be able to jump the seeded book
  // back above a second book that was genuinely published more recently.
  const runId = Date.now();
  const bookBTitle = `Anti-spam feed-order book ${runId}`;
  const chapterBTitle = `Anti-spam feed-order chapter ${runId}`;

  const { bookId: bookBId } = await createDraftBookWithChapter(page, {
    bookTitle: bookBTitle,
    chapterTitle: chapterBTitle,
    chapterBody: "Second seeded book, published after the main test book, for feed-order comparison.",
  });
  await publishBookAndChapter(page, bookBId, chapterBTitle);

  // Add and publish a second chapter on the ORIGINAL seeded book — its first
  // chapter was already published in global-setup, so this is a second,
  // near-immediate publish on the same book, well within any 24h window.
  const secondChapterTitle = `Anti-spam test chapter 2 ${runId}`;
  await page.goto(`/en/dashboard/books/${fixtures.bookId}`);
  await openTableOfContentsTab(page);
  await page.click('button:has-text("+ New chapter")');
  await page.fill("[name=title]", secondChapterTitle);
  await page.click(".ProseMirror");
  await page.keyboard.type("Second chapter, published immediately after the first.");
  await page.locator("[name=title]").focus();
  await page.click('button:has-text("Add chapter")');
  await expect(page.getByText(secondChapterTitle)).toBeVisible();
  await page
    .getByRole("button", { name: `Actions for "${secondChapterTitle}"` })
    .click();
  await page.getByRole("menuitem", { name: "Publish", exact: true }).click();
  await page.waitForLoadState("networkidle");

  await page.goto("/en");
  const feedTitles = await page.locator("ul.divide-y > li").allTextContents();
  const indexOfBookB = feedTitles.findIndex((t) => t.includes(bookBTitle));
  const indexOfBookA = feedTitles.findIndex((t) => t.includes(fixtures.bookTitle));

  expect(indexOfBookB, "book B should appear in the feed").toBeGreaterThanOrEqual(0);
  expect(indexOfBookA, "seeded book A should appear in the feed").toBeGreaterThanOrEqual(0);
  // Lower index = higher in the feed = more recent last_pushed_at.
  expect(indexOfBookB).toBeLessThan(indexOfBookA);
});
