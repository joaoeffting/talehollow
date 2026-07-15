"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

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
