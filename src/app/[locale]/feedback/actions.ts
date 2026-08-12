"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function submitFeedback(locale: string, formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login`);

  const content = (formData.get("content") as string)?.trim();
  if (!content) {
    redirect(`/${locale}/feedback?error=${encodeURIComponent("Feedback can't be empty.")}`);
  }

  const { error } = await supabase
    .from("feedback")
    .insert({ user_id: data.claims.sub, content });

  if (error) {
    redirect(`/${locale}/feedback?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/${locale}/feedback?sent=1`);
}
