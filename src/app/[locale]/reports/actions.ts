"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function fileReport(
  targetType: "book" | "chapter" | "scrapbook_entry",
  targetId: string,
  locale: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return;

  await supabase.from("reports").insert({
    target_type: targetType,
    target_id: targetId,
    reporter_id: data.claims.sub,
    reason: formData.get("reason") as string,
  });

  revalidatePath(`/${locale}/admin/reports`);
}
