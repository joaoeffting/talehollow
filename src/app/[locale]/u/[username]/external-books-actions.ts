"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

// Same shape as uploadBookCover (dashboard/books/actions.ts) and
// uploadAvatar (actions.ts) — path is "<user_id>/<external_book_id>/cover.<ext>"
// rather than just "<external_book_id>/cover.<ext>": the storage RLS policy
// (supabase-external-books.sql) scopes write access by the *first* path
// segment matching the caller's own uid, so that segment has to be userId,
// not the book's own id.
async function uploadExternalBookCover(
  supabase: SupabaseClient,
  userId: string,
  externalBookId: string,
  cover: File,
) {
  const ext = cover.name.split(".").pop();
  const path = `${userId}/${externalBookId}/cover.${ext}`;
  const { error } = await supabase.storage
    .from("external-book-covers")
    .upload(path, cover);
  if (error) throw error;

  const { data } = supabase.storage
    .from("external-book-covers")
    .getPublicUrl(path);
  return data.publicUrl;
}

// Exported for settings/actions.ts's deleteAccount, same reasoning as
// deleteBookCoverFiles/deleteAvatarFiles.
export async function deleteExternalBookCoverFiles(
  supabase: SupabaseClient,
  userId: string,
  externalBookId: string,
) {
  const folder = `${userId}/${externalBookId}`;
  const { data: existing } = await supabase.storage
    .from("external-book-covers")
    .list(folder);
  if (existing && existing.length > 0) {
    await supabase.storage
      .from("external-book-covers")
      .remove(existing.map((file) => `${folder}/${file.name}`));
  }
}

export async function createExternalBook(
  username: string,
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;
  const userId = data.claims.sub;

  const { count } = await supabase
    .from("external_books")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", userId);

  const { data: book, error } = await supabase
    .from("external_books")
    .insert({
      profile_id: userId,
      title: formData.get("title") as string,
      synopsis: (formData.get("synopsis") as string) || null,
      buy_url: formData.get("buy_url") as string,
      position: (count ?? 0) + 1,
    })
    .select()
    .single();
  if (error) throw error;

  const cover = formData.get("cover") as File | null;
  if (cover && cover.size > 0) {
    const cover_url = await uploadExternalBookCover(
      supabase,
      userId,
      book.id,
      cover,
    );
    await supabase
      .from("external_books")
      .update({ cover_url })
      .eq("id", book.id);
  }

  revalidatePath(`/${locale}/u/${username}`);
}

export async function updateExternalBook(
  externalBookId: string,
  username: string,
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;
  const userId = data.claims.sub;

  const cover = formData.get("cover") as File | null;
  const coverUpdate: { cover_url?: string } = {};
  if (cover && cover.size > 0) {
    await deleteExternalBookCoverFiles(supabase, userId, externalBookId);
    coverUpdate.cover_url = await uploadExternalBookCover(
      supabase,
      userId,
      externalBookId,
      cover,
    );
  }

  await supabase
    .from("external_books")
    .update({
      title: formData.get("title") as string,
      synopsis: (formData.get("synopsis") as string) || null,
      buy_url: formData.get("buy_url") as string,
      ...coverUpdate,
    })
    .eq("id", externalBookId);
  // No .eq('profile_id', ...) filter needed — the RLS update policy already
  // silently no-ops this for anyone else's row.

  revalidatePath(`/${locale}/u/${username}`);
}

export async function deleteExternalBook(
  externalBookId: string,
  username: string,
  locale: string,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  await deleteExternalBookCoverFiles(supabase, data.claims.sub, externalBookId);
  await supabase.from("external_books").delete().eq("id", externalBookId);

  revalidatePath(`/${locale}/u/${username}`);
}

export async function reorderExternalBooks(
  username: string,
  locale: string,
  orderedIds: string[],
) {
  const supabase = await createClient();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("external_books").update({ position: index + 1 }).eq("id", id),
    ),
  );

  revalidatePath(`/${locale}/u/${username}`);
}
