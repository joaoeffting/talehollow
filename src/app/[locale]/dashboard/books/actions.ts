"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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
    })
    .select()
    .single();

  if (error) throw error;

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

  await supabase
    .from("books")
    .update({
      title: formData.get("title") as string,
      genre: formData.get("genre") as string,
      language: formData.get("language") as string,
      synopsis: formData.get("synopsis") as string,
      cover_image_url: formData.get("cover_image_url") as string,
    })
    .eq("id", bookId);
  // No .eq('author_id', ...) filter needed here — the RLS update policy
  // from step 1 already silently no-ops this query if bookId isn't yours.

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/books/${bookId}`);
}

export async function deleteBook(bookId: string, locale: string) {
  const supabase = await createClient();
  await supabase.from("books").delete().eq("id", bookId);
  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard`);
}
