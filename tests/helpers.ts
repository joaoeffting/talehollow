import { type Page, expect } from "@playwright/test";

// Creates a draft book with one draft chapter via the real dashboard UI.
// Neither is published yet — call publishBookAndChapter() separately, since
// that's the path that actually exercises record_chapter_publish (see below).
export async function createDraftBookWithChapter(
  page: Page,
  {
    bookTitle,
    chapterTitle,
    chapterBody,
  }: { bookTitle: string; chapterTitle: string; chapterBody: string },
): Promise<{ bookId: string }> {
  await page.goto("/en/dashboard/books/new");
  await page.fill("[name=title]", bookTitle);
  await page.selectOption("[name=genre]", "fantasy");
  await page.fill(
    "[name=synopsis]",
    "Seeded for automated anti-spam tests — safe to delete.",
  );
  await page.click('button:has-text("Create draft")');
  // Must require a UUID here, not just "any non-slash segment" — that would
  // also match the /dashboard/books/new page we're already on, resolving
  // before the form actually submits.
  await page.waitForURL(/\/en\/dashboard\/books\/[0-9a-fA-F-]{36}$/);
  const bookId = new URL(page.url()).pathname.split("/").pop()!;

  await openTableOfContentsTab(page);
  await page.click('button:has-text("+ New chapter")');
  await page.fill("[name=title]", chapterTitle);
  await page.click(".ProseMirror");
  await page.keyboard.type(chapterBody);
  // Tiptap only syncs its hidden form input on its own onUpdate callback —
  // focusing another field blurs the editor so that fires before submit.
  await page.locator("[name=title]").focus();
  await page.click('button:has-text("Add chapter")');
  await expect(page.getByText(chapterTitle)).toBeVisible();

  return { bookId };
}

// Publishes the book, then the chapter, via the same per-toggle controls a
// real author uses — deliberately NOT the "Publish book + all chapters"
// shortcut, which bulk-updates is_published directly and skips
// record_chapter_publish/notify_followers entirely (the exact anti-spam RPC
// this suite exists to prove behaves correctly).
export async function publishBookAndChapter(
  page: Page,
  bookId: string,
  chapterTitle: string,
) {
  await page.goto(`/en/dashboard/books/${bookId}`);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.waitForURL(/\/en\/?$/);

  await page.goto(`/en/dashboard/books/${bookId}`);
  await openTableOfContentsTab(page);
  await page
    .getByRole("button", { name: `Actions for "${chapterTitle}"` })
    .click();
  await page.getByRole("menuitem", { name: "Publish", exact: true }).click();
  await page.waitForLoadState("networkidle");
}

// The book dashboard page splits "Story Details" and "Table of Contents"
// (chapter list, "+ New chapter", per-chapter actions menu) into separate
// Base UI tabs — the chapter tab's content isn't even mounted until its
// trigger is clicked, so every chapter-list interaction needs this first.
export async function openTableOfContentsTab(page: Page) {
  await page.getByRole("tab", { name: "Table of Contents" }).click();
}

export async function getChapterId(
  page: Page,
  bookId: string,
  chapterTitle: string,
): Promise<string> {
  await page.goto(`/en/books/${bookId}`);
  const href = await page
    .locator("a", { hasText: chapterTitle })
    .getAttribute("href");
  const match = href?.match(/chapters\/([0-9a-fA-F-]{36})/);
  if (!match) {
    throw new Error(`Could not extract chapterId from chapter link href: ${href}`);
  }
  return match[1];
}
