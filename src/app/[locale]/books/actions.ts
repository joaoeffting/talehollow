"use server";

import { revalidatePath } from "next/cache";
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
  }

  revalidatePath(`/${locale}/books/${bookId}/chapters/${chapterId}`);
  revalidatePath(`/${locale}/books/${bookId}`); // the book page's aggregate total needs to update too
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
