"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function updatePassword(locale: string, formData: FormData) {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (password !== confirmPassword) {
    redirect(`/${locale}/reset-password?error=${encodeURIComponent("Passwords don't match.")}`);
  }

  const supabase = await createClient();
  // Relies on the recovery session /auth/confirm's verifyOtp already
  // established (cookie-based) — there's no separate "reset token" passed
  // through this form.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/${locale}/reset-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`/${locale}/account`);
}
