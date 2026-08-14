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

// Adds a second (or later) chapter to a book that already exists — the
// same per-field steps createDraftBookWithChapter uses for its first
// chapter, split out so reorder tests can seed more than one.
export async function addChapterToBook(
  page: Page,
  bookId: string,
  { title, body }: { title: string; body: string },
) {
  await page.goto(`/en/dashboard/books/${bookId}`);
  await openTableOfContentsTab(page);
  await page.click('button:has-text("+ New chapter")');
  await page.fill("[name=title]", title);
  await page.click(".ProseMirror");
  await page.keyboard.type(body);
  await page.locator("[name=title]").focus();
  await page.click('button:has-text("Add chapter")');
  await expect(page.getByText(title)).toBeVisible();
}

// The signed-in test account's own username — needed for any test that
// visits its own public profile (/u/[username]) rather than a book/chapter
// URL, since nothing in the seeded fixtures carries it directly.
export async function getOwnUsername(page: Page): Promise<string> {
  await page.goto("/en/account");
  const href = await page
    .getByRole("link", { name: "View public profile" })
    .getAttribute("href");
  const match = href?.match(/\/u\/([^/?]+)/);
  if (!match) {
    throw new Error(`Could not extract username from profile link href: ${href}`);
  }
  return match[1];
}

// dnd-kit's keyboard sensor (wired alongside the pointer sensor on every
// sortable list in this app) is far more reliable to drive from Playwright
// than simulating a real pointer drag: focus the grip handle, Space to pick
// up, Arrow keys to move, Space to drop. Same interaction a keyboard-only
// author would use.
//
// NOTE: this only works for sortable lists that aren't nested inside a Base
// UI composite widget (e.g. Accordion) — composite roving-focus intercepts
// ArrowDown/ArrowUp for its own item-to-item navigation before dnd-kit's
// KeyboardSensor sees them. external-books-manager.tsx (plain divs) works
// fine with this; chapter-list.tsx (Accordion-wrapped) does not — see
// dragViaPointer below for that case.
export async function reorderViaKeyboard(
  page: Page,
  handleName: string | RegExp,
  direction: "ArrowDown" | "ArrowUp" = "ArrowDown",
) {
  await page.getByRole("button", { name: handleName }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press(direction);
  await page.keyboard.press("Space");
}

// Real pointer drag for sortable lists where the keyboard sensor path is
// unavailable or unreliable (see reorderViaKeyboard's note). dnd-kit's
// PointerSensor needs the first move past its activation `distance` to
// register the drag start, then further moves to cross the drop target —
// a single mouse.move straight to the destination doesn't reliably fire
// dnd-kit's own dragOver/collision detection the way a real drag does.
export async function dragViaPointer(page: Page, fromHandleName: string | RegExp, toHandleName: string | RegExp) {
  const from = page.getByRole("button", { name: fromHandleName });
  const to = page.getByRole("button", { name: toHandleName });

  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  if (!fromBox || !toBox) {
    throw new Error("Could not get bounding box for drag handle(s)");
  }

  const fromCenter = { x: fromBox.x + fromBox.width / 2, y: fromBox.y + fromBox.height / 2 };
  const toCenter = { x: toBox.x + toBox.width / 2, y: toBox.y + toBox.height / 2 };

  await page.mouse.move(fromCenter.x, fromCenter.y);
  await page.mouse.down();
  // Past PointerSensor's activationConstraint.distance (4px) before
  // anything else, so dnd-kit actually registers a drag start.
  await page.mouse.move(fromCenter.x, fromCenter.y + 10);
  await page.mouse.move(toCenter.x, toCenter.y, { steps: 10 });
  await page.mouse.up();
}
