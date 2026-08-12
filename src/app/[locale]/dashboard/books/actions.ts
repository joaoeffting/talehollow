"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function recordAnonymousView(chapterId: string) {
  const cookieStore = await cookies();
  const anonId = cookieStore.get("anon_id")?.value;

  if (!anonId) return;

  const supabase = await createClient();
  await supabase.rpc("record_anon_view", {
    p_chapter_id: chapterId,
    p_viewer_key: anonId,
  });
}

export async function toggleBookPublished(
  bookid: string,
  locale: string,
  isPublished: boolean,
) {
  const supabase = await createClient();

  await supabase
    .from("books")
    .update({ is_published: !isPublished })
    .eq("id", bookid);
  revalidatePath(`/${locale}/dashboard/books/${bookid}`);
  redirect(`/${locale}`);
}

export async function publishBookAndChapters(bookId: string, locale: string) {
  const supabase = await createClient();

  await supabase.from("books").update({ is_published: true }).eq("id", bookId);
  await supabase
    .from("chapters")
    .update({ is_published: true })
    .eq("book_id", bookId);

  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
  revalidatePath(`/${locale}`);
}

// Shared by createBook and updateBook — both need "take this File, put it at
// this book's cover path, hand back the public URL," just at different
// points (createBook only has a bookId *after* its insert; updateBook
// already has one).
async function uploadBookCover(
  supabase: SupabaseClient,
  bookId: string,
  cover: File,
) {
  const ext = cover.name.split(".").pop();
  const path = `${bookId}/cover.${ext}`;
  const { error } = await supabase.storage
    .from("book-covers")
    .upload(path, cover);
  if (error) throw error;

  // getPublicUrl is a pure string-builder (bucket + path), not a network
  // call — safe to use immediately after the upload completes above.
  const { data } = supabase.storage.from("book-covers").getPublicUrl(path);
  return data.publicUrl;
}

// Shared by updateBook (replacing a cover), removeCover, deleteBook, and
// settings/actions.ts's deleteAccount (cleaning up every book's cover on
// the way out) — all need "whatever's currently in this book's cover
// folder, gone," so it's pulled out rather than repeated. Storage has no
// equivalent of SQL's `on delete cascade`, so nothing does this
// automatically.
export async function deleteBookCoverFiles(supabase: SupabaseClient, bookId: string) {
  const { data: existing } = await supabase.storage
    .from("book-covers")
    .list(bookId);
  if (existing && existing.length > 0) {
    await supabase.storage
      .from("book-covers")
      .remove(existing.map((file) => `${bookId}/${file.name}`));
  }
}

export async function createBook(locale: string, formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login`);

  const { data: book, error } = await supabase
    .from("books")
    .insert({
      author_id: data.claims.sub, // must match auth.uid() or the insert RLS policy rejects it
      title: formData.get("title") as string,
      genre: formData.get("genre") as string,
      language: formData.get("language") as string,
      synopsis: formData.get("synopsis") as string,
      is_mature: formData.get("is_mature") === "on",
      content_warning: (formData.get("content_warning") as string) || null,
    })
    .select()
    .single();

  if (error) throw error;

  const cover = formData.get("cover") as File | null;
  if (cover && cover.size > 0) {
    const cover_image_url = await uploadBookCover(supabase, book.id, cover);
    await supabase.from("books").update({ cover_image_url }).eq("id", book.id);
  }

  // revalidatePath tells Next.js to throw away its cached render of that
  // route and re-run the Server Component tree next time it's requested —
  // otherwise the dashboard list wouldn't show the new book without a
  // manual refresh.
  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard/books/${book.id}`);
}

export async function updateBook(
  bookId: string,
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const cover = formData.get("cover") as File | null;
  const coverUpdate: { cover_image_url?: string } = {};
  if (cover && cover.size > 0) {
    await deleteBookCoverFiles(supabase, bookId);
    coverUpdate.cover_image_url = await uploadBookCover(
      supabase,
      bookId,
      cover,
    );
  }

  await supabase
    .from("books")
    .update({
      title: formData.get("title") as string,
      genre: formData.get("genre") as string,
      language: formData.get("language") as string,
      synopsis: formData.get("synopsis") as string,
      is_mature: formData.get("is_mature") === "on",
      content_warning: (formData.get("content_warning") as string) || null,
      ...coverUpdate,
    })
    .eq("id", bookId);
  // No .eq('author_id', ...) filter needed here — the RLS update policy
  // from step 1 already silently no-ops this query if bookId isn't yours.

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
}

// The counterpart to uploading a cover — lets an author go back to having no
// cover at all, rather than "upload a new one" being the only way to change
// anything about it.
export async function removeCover(bookId: string, locale: string) {
  const supabase = await createClient();
  await deleteBookCoverFiles(supabase, bookId);
  await supabase
    .from("books")
    .update({ cover_image_url: null })
    .eq("id", bookId);
  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
}

export async function deleteBook(bookId: string, locale: string) {
  const supabase = await createClient();
  await supabase.from("books").delete().eq("id", bookId);
  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard`);
}
