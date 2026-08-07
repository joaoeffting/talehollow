import { createClient } from "@/utils/supabase/server";

// One query per page load for "which of these books has the signed-in
// viewer already saved" — a Set lookup, not a query per book, same
// reasoning as getBookRankingsLookup. Returns an empty set for a
// logged-out viewer without hitting the DB at all.
export async function getSavedBookIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string | null,
): Promise<Set<string>> {
  if (!userId) return new Set();

  const { data } = await supabase
    .from("saved_books")
    .select("book_id")
    .eq("user_id", userId);

  return new Set((data ?? []).map((row) => row.book_id));
}
