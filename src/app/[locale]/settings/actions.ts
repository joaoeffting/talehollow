"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { deleteBookCoverFiles } from "../dashboard/books/actions";
import { deleteAvatarFiles } from "../u/[username]/actions";

export async function updateSiteLanguage(
  newLocale: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  const uiLanguage = formData.get("ui_language") as string;

  await supabase
    .from("profiles")
    .update({ ui_language: uiLanguage })
    .eq("id", data.claims.sub);

  // Re-navigate to the SAME page, but under the new locale prefix — this is
  // what actually "switches" the site language right now, since next-intl's
  // routing is driven by the URL, not just a stored preference. (Only a
  // no-op today, since 'pt' isn't selectable yet — see the form below — but
  // the wiring is real.)
  redirect(`/${uiLanguage}/settings`);
}

export async function updateContentLanguage(
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  await supabase
    .from("profiles")
    .update({ content_language: formData.get("content_language") as string })
    .eq("id", data.claims.sub);

  // This one doesn't change the URL — content language is a pure data
  // filter (Phase 7), not a routing concern, so staying on the same page
  // under the same locale is correct.
  revalidatePath(`/${locale}/settings`);
}

export async function deleteAccount(locale: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login`);
  const userId = data.claims.sub;

  // Storage cleanup has to happen BEFORE the DB rows disappear — cover_url
  // and the list of owned books only exist to look up right now, not after
  // delete_own_account() runs below.
  const { data: profile } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single();
  const { data: books } = await supabase
    .from("books")
    .select("id")
    .eq("author_id", userId);

  if (profile?.avatar_url) await deleteAvatarFiles(supabase, userId);
  for (const book of books ?? []) {
    await deleteBookCoverFiles(supabase, book.id);
  }

  // Everything else (books, chapters, comments, likes, views, follows,
  // notifications, reports, scrapbook entries, the profile row, and the
  // auth.users row itself) is handled by one security-definer Postgres
  // function — see supabase-account-deletion.sql for why this can't just
  // be `delete from auth.users`: almost none of those tables cascade.
  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    redirect(
      `/${locale}/settings?error=${encodeURIComponent("Couldn't delete your account — please try again or contact support.")}`,
    );
  }

  await supabase.auth.signOut();
  redirect(`/${locale}?accountDeleted=1`);
}
