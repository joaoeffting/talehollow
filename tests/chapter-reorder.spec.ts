import { test, expect } from "@playwright/test";
import {
  createDraftBookWithChapter,
  addChapterToBook,
  openTableOfContentsTab,
  dragViaPointer,
} from "./helpers";

// Seeds its own book/chapters rather than reusing the anti-spam suite's
// shared fixture — this only touches chapter order, but keeping it
// self-contained means it can't be affected by (or accidentally affect)
// the other spec's assumptions about the seeded chapter.
test("dragging a chapter's grip handle reorders the table of contents", async ({
  page,
}) => {
  const runId = Date.now();
  const bookTitle = `Reorder test book ${runId}`;
  const chapterATitle = `Chapter A ${runId}`;
  const chapterBTitle = `Chapter B ${runId}`;

  const { bookId } = await createDraftBookWithChapter(page, {
    bookTitle,
    chapterTitle: chapterATitle,
    chapterBody: "First chapter, should end up second after reordering.",
  });
  await addChapterToBook(page, bookId, {
    title: chapterBTitle,
    body: "Second chapter, should end up first after reordering.",
  });

  await page.goto(`/en/dashboard/books/${bookId}`);
  await openTableOfContentsTab(page);

  // Scoped to a `span.font-medium` specifically, not just any `.font-medium`
  // — shadcn's AccordionTrigger button carries that class by default too,
  // which would otherwise match the whole row's concatenated text as well.
  const titles = () =>
    page
      .locator('[data-slot="accordion-trigger"] span.font-medium')
      .allTextContents();

  await expect.poll(titles).toEqual([chapterATitle, chapterBTitle]);

  // Pointer drag, not keyboard — see dragViaPointer's note in helpers.ts:
  // this list is Accordion-wrapped, and Base UI's composite roving-focus
  // intercepts the arrow keys dnd-kit's KeyboardSensor needs before they
  // ever reach it, so a keyboard-driven reorder silently no-ops here.
  await dragViaPointer(
    page,
    `Reorder "${chapterATitle}" — drag, or focus and use arrow keys`,
    `Reorder "${chapterBTitle}" — drag, or focus and use arrow keys`,
  );

  // Reordering updates local state immediately (no server round trip
  // needed to see it) — reorderChapters fires in the background.
  await expect.poll(titles).toEqual([chapterBTitle, chapterATitle]);

  // handleDragEnd calls reorderChapters fire-and-forget (`void`, not
  // awaited) — reloading immediately can race ahead of that background
  // mutation actually landing, making this assertion flake on whether the
  // save happened to finish in time rather than on whether it saved
  // correctly at all. Waiting for the network to go quiet gives it a
  // chance to actually complete first.
  await page.waitForLoadState("networkidle");

  // Reload to confirm the reorder actually persisted server-side, not
  // just in the optimistic client state.
  await page.reload();
  await openTableOfContentsTab(page);
  await expect.poll(titles).toEqual([chapterBTitle, chapterATitle]);
});
