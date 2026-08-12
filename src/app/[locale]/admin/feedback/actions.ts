"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function toggleFeedbackReviewed(
  feedbackId: string,
  locale: string,
  isReviewed: boolean,
) {
  const supabase = await createClient();

  await supabase
    .from("feedback")
    .update({ reviewed_at: isReviewed ? null : new Date().toISOString() })
    .eq("id", feedbackId);

  revalidatePath(`/${locale}/admin/feedback`);
}
