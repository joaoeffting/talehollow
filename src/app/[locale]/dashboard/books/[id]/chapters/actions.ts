"use server";

import { revalidatePath } from "next/cache";
import * as Sentry from "@sentry/nextjs";
import mammoth from "mammoth";
import { createClient } from "@/utils/supabase/server";
import { sanitizeChapterHtml } from "@/lib/sanitize-chapter-html";
import { splitIntoChapters } from "@/lib/parse-docx-chapters";

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

export type ParsedChapter = { title: string; contentHtml: string; excerpt: string };

// Called directly (not as a <form action>) — the caller needs the parsed
// preview back to render and let the author confirm/edit before anything
// touches the database, not a redirect/revalidate.
export async function parseDocxForImport(
  formData: FormData,
): Promise<
  | { ok: true; chapters: ParsedChapter[]; hadFrontMatter: boolean }
  | { ok: false; error: string }
> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file uploaded." };
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return {
      ok: false,
      error: 'Please upload a .docx file (Word\'s older .doc format isn\'t supported).',
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let html: string;
  try {
    html = (await mammoth.convertToHtml({ buffer })).value;
  } catch {
    return { ok: false, error: "Couldn't read that file — is it a valid .docx?" };
  }

  const { chapters: rawChapters, frontMatterHtml } = splitIntoChapters(html);

  if (rawChapters.length === 0) {
    return {
      ok: false,
      error:
        'No chapter headings found. Make sure each chapter title uses Word\'s "Heading 1" style, not just bold/large text.',
    };
  }

  // Sanitized now, at parse time — the preview the author reviews and the
  // content that eventually gets saved (importChapters below) need to
  // match exactly, or "looks right in preview" stops meaning anything.
  const chapters: ParsedChapter[] = rawChapters.map((c) => {
    const sanitized = sanitizeChapterHtml(c.contentHtml);
    return {
      title: c.title,
      contentHtml: sanitized,
      excerpt: sanitized
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160),
    };
  });

  const hadFrontMatter =
    frontMatterHtml.replace(/<[^>]+>/g, "").trim().length > 0;

  return { ok: true, chapters, hadFrontMatter };
}

export async function importChapters(
  bookId: string,
  locale: string,
  chapters: { title: string; contentHtml: string }[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("chapters")
    .select("*", { count: "exact", head: true })
    .eq("book_id", bookId);

  const startPosition = (count ?? 0) + 1;

  const { error } = await supabase.from("chapters").insert(
    chapters.map((chapter, index) => ({
      book_id: bookId,
      position: startPosition + index,
      title: chapter.title,
      // Re-sanitized here too, not just trusted from the preview step —
      // this is the actual write path, and nothing guarantees the client
      // handed back exactly what parseDocxForImport produced.
      content: sanitizeChapterHtml(chapter.contentHtml),
    })),
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
  return { ok: true };
}
