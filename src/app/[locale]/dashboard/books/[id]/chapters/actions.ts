"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

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
    await supabase.rpc("record_chapter_publish", { p_book_id: bookId });
    await supabase.rpc("notify_followers_for_book", { p_book_id: bookId });
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
    content: formData.get("content") as string,
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
      content: formData.get("content") as string,
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

export async function reorderChapter(
  chapterId: string,
  bookId: string,
  locale: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();
  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, position")
    .eq("book_id", bookId)
    .order("position");

  if (!chapters) return;
  const index = chapters.findIndex((c) => c.id === chapterId);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  // Already at the top/bottom — nothing to swap with, so bail out quietly
  // rather than letting the swap logic below index out of bounds.
  if (swapWith < 0 || swapWith >= chapters.length) return;

  const a = chapters[index];
  const b = chapters[swapWith];

  // Reordering is just swapping the two chapters' `position` values —
  // no separate "order" table or fractional-index scheme needed at this scale.
  await supabase
    .from("chapters")
    .update({ position: b.position })
    .eq("id", a.id);
  await supabase
    .from("chapters")
    .update({ position: a.position })
    .eq("id", b.id);

  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
}
