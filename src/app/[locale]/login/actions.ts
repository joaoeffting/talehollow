"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SITE_URL } from "@/lib/site";

export async function login(locale: string, formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  // Back to the same tab, with Supabase's own message (e.g. "Invalid login
  // credentials") shown inline — a blank "/error" page told the reader
  // nothing about what to fix.
  if (error) {
    redirect(
      `/${locale}/login?tab=login&error=${encodeURIComponent(error.message)}`,
    );
  }
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

  if (error) {
    redirect(
      `/${locale}/login?tab=signup&error=${encodeURIComponent(error.message)}`,
    );
  }
  redirect(`/${locale}/check-email`); // Supabase requires email confirmation by default
}

export async function requestPasswordReset(locale: string, formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  // redirectTo only matters as a fallback — the "Reset Password" email
  // template is configured (Supabase Dashboard) to link straight to
  // /auth/confirm with a token_hash, bypassing Supabase's own hosted
  // /verify redirect entirely. See src/app/auth/confirm/route.ts.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${SITE_URL}/reset-password`,
  });

  // Supabase already replies with success for an email that doesn't exist
  // (avoids leaking which emails are registered) — an `error` here is a
  // genuine failure (malformed address, rate limit), safe to surface as-is.
  if (error) {
    redirect(
      `/${locale}/forgot-password?error=${encodeURIComponent(error.message)}`,
    );
  }
  redirect(`/${locale}/forgot-password?sent=1`);
}

export async function logout(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut(); // clears the session cookie via the server client's setAll
  redirect(`/${locale}`);
}
