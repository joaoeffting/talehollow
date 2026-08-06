"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function toggleLike(
  chapterId: string,
  bookId: string,
  locale: string,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return; // silently no-op for logged-out visitors — no like button should even render for them

  const userId = data.claims.sub;

  // Check for an existing like first because "like" here is a toggle, not
  // a one-way insert — we need to know which branch (like vs. unlike) to take.
  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("chapter_id", chapterId)
    .eq("user_id", userId)
    .maybeSingle(); // returns null instead of throwing when there's no matching row

  if (existing) {
    await supabase.from("likes").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("likes")
      .insert({ chapter_id: chapterId, book_id: bookId, user_id: userId });

    await notifyBookAuthor(supabase, bookId, chapterId, userId, "new_like");
  }

  revalidatePath(`/${locale}/books/${bookId}/chapters/${chapterId}`);
  revalidatePath(`/${locale}/books/${bookId}`); // the book page's aggregate total needs to update too
}

// Shared by toggleLike and postComment — both notify the book's author about
// an interaction on their work, and both need to skip notifying an author
// about their own like/comment on their own chapter.
async function notifyBookAuthor(
  supabase: SupabaseClient,
  bookId: string,
  chapterId: string,
  actorId: string,
  type: "new_like" | "new_comment",
) {
  const { data: book } = await supabase
    .from("books")
    .select("author_id")
    .eq("id", bookId)
    .single();

  if (book && book.author_id !== actorId) {
    await supabase.from("notifications").insert({
      user_id: book.author_id,
      actor_id: actorId,
      book_id: bookId,
      chapter_id: chapterId,
      type,
    });
  }
}

export async function postComment(
  chapterId: string,
  bookId: string,
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  await supabase.from("comments").insert({
    chapter_id: chapterId,
    book_id: bookId,
    user_id: data.claims.sub,
    content: formData.get("content") as string,
  });

  await notifyBookAuthor(supabase, bookId, chapterId, data.claims.sub, "new_comment");

  revalidatePath(`/${locale}/books/${bookId}/chapters/${chapterId}`);
  revalidatePath(`/${locale}/books/${bookId}`); // the book page's total comment count needs to update too
}

export async function deleteComment(
  commentId: string,
  chapterId: string,
  bookId: string,
  locale: string,
) {
  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", commentId);
  revalidatePath(`/${locale}/books/${bookId}/chapters/${chapterId}`);
  revalidatePath(`/${locale}/books/${bookId}`);
}
