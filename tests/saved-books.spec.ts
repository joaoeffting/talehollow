import { test, expect } from "@playwright/test";
import {
  createDraftBookWithChapter,
  publishBookAndChapter,
  getOwnUsername,
} from "./helpers";

test("saving a book surfaces it under the profile's Saved tab, unsaving removes it", async ({
  page,
}) => {
  const runId = Date.now();
  const bookTitle = `Save test book ${runId}`;
  const chapterTitle = `Save test chapter ${runId}`;

  const { bookId } = await createDraftBookWithChapter(page, {
    bookTitle,
    chapterTitle,
    chapterBody: "Content for the save-button test.",
  });
  await publishBookAndChapter(page, bookId, chapterTitle);

  await page.goto(`/en/books/${bookId}`);
  await page.getByRole("button", { name: "Save this book" }).click();
  await expect(
    page.getByRole("button", { name: "Remove from saved books" }),
  ).toBeVisible();

  const username = await getOwnUsername(page);
  await page.goto(`/en/u/${username}?tab=saved`);
  await expect(page.getByRole("link", { name: bookTitle })).toBeVisible();

  // The Saved tab's list uses the icon-variant SaveButton — same
  // aria-label, just no visible "Saved" text next to it.
  await page.getByRole("button", { name: "Remove from saved books" }).click();
  await page.reload();
  await expect(page.getByText(bookTitle)).not.toBeVisible();
});
