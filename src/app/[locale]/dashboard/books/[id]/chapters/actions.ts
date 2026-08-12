"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import { createClient } from "@/utils/supabase/server";
import { sanitizeChapterHtml } from "@/lib/sanitize-chapter-html";

export async function toggleChapterPublished(
  chapterId: string,
  bookId: string,
  locale: string,
  isPublished: boolean,
) {
  const supabase = await createClient();
  const nowPublishing = !isPublished;

  await supabase
    .from("chapters")
    .update({ is_published: nowPublishing })
    .eq("id", chapterId);

  if (nowPublishing) {
    // record_chapter_publish handles the 24h feed-push throttle;
    // notify_followers_for_book handles the separate, same-calendar-day
    // notification throttle. Gated independently on purpose — a push and a
    // notification blast don't have to happen on the same cadence.
    //
    // Both errors are reported (not thrown) rather than silently ignored —
    // notify_followers_for_book previously failed on every single call
    // (PGRST202, the function didn't exist in the live DB at all) with
    // nobody noticing for exactly this reason. A failed push/notification
    // shouldn't block the chapter from publishing, but it should be
    // visible somewhere now that there's error tracking to send it to.
    const [pushResult, notifyResult] = await Promise.all([
      supabase.rpc("record_chapter_publish", { p_book_id: bookId }),
      supabase.rpc("notify_followers_for_book", { p_book_id: bookId }),
    ]);
    if (pushResult.error) {
      Sentry.captureException(pushResult.error, {
        extra: { rpc: "record_chapter_publish", bookId, chapterId },
      });
    }
    if (notifyResult.error) {
      Sentry.captureException(notifyResult.error, {
        extra: { rpc: "notify_followers_for_book", bookId, chapterId },
      });
    }
  }

  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
  revalidatePath(`/${locale}`);
}

export async function createChapter(
  bookId: string,
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();

  // { count: 'exact', head: true } asks Postgres for just the row count,
  // not the rows themselves — cheaper than fetching everything just to
  // read .length. Used here to auto-assign the new chapter's position as
  // "one after however many already exist."
  const { count } = await supabase
    .from("chapters")
    .select("*", { count: "exact", head: true })
    .eq("book_id", bookId);

  await supabase.from("chapters").insert({
    book_id: bookId,
    position: (count ?? 0) + 1,
    title: formData.get("title") as string,
    content: sanitizeChapterHtml(formData.get("content") as string),
  });

  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
}

export async function updateChapter(
  chapterId: string,
  bookId: string,
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();

  await supabase
    .from("chapters")
    .update({
      title: formData.get("title") as string,
      content: sanitizeChapterHtml(formData.get("content") as string),
    })
    .eq("id", chapterId);

  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
}

export async function deleteChapter(
  chapterId: string,
  bookId: string,
  locale: string,
) {
  const supabase = await createClient();
  await supabase.from("chapters").delete().eq("id", chapterId);
  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
}

export async function reorderChapters(
  bookId: string,
  locale: string,
  orderedChapterIds: string[],
) {
  const supabase = await createClient();

  // The drag-and-drop list always hands back the *entire* new order, not a
  // single move — so this just writes each chapter's index+1 straight
  // through as its position, no swap logic needed. One update per chapter
  // is fine at the scale a single book's table of contents actually reaches.
  await Promise.all(
    orderedChapterIds.map((chapterId, index) =>
      supabase
        .from("chapters")
        .update({ position: index + 1 })
        .eq("id", chapterId),
    ),
  );

  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
}
