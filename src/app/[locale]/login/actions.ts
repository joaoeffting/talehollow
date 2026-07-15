"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function login(locale: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) redirect(`/${locale}/error`);
  redirect(`/${locale}/account`);
}

export async function signup(locale: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    // Anything under `options.data` lands in auth.users.raw_user_meta_data.
    // `locale` rides along here too, not just `username` — Phase 3's
    // updated trigger reads it to default a brand-new profile's language
    // preferences to whatever locale the reader signed up from.
    options: { data: { username: formData.get("username") as string, locale } },
  });

  if (error) redirect(`/${locale}/error`);
  redirect(`/${locale}/check-email`); // Supabase requires email confirmation by default
}

export async function logout(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut(); // clears the session cookie via the server client's setAll
  redirect(`/${locale}`);
}
