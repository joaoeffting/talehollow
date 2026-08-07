import { createClient } from "@/utils/supabase/server";

export type BookRankingStats = {
  rank: number;
  uniqueViews: number;
  uniqueLikes: number;
  uniqueCommenters: number;
};

// One query against the whole book_rankings view, grouped by (language,
// genre) to compute each book's rank within its own segment — cheaper than
// a per-book or per-genre query when a page renders many books across
// several genres at once (e.g. the homepage feed). book_rankings has no
// stored rank column; ordering by score once and counting positions per
// (language, genre) bucket as we go reproduces exactly what the genre
// rankings page itself computes via array index.
export async function getBookRankingsLookup(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, BookRankingStats>> {
  const { data: rankings } = await supabase
    .from("book_rankings")
    .select("id, genre, language, unique_views, unique_likes, unique_commenters")
    .order("score", { ascending: false });

  const lookup = new Map<string, BookRankingStats>();
  const nextRankBySegment = new Map<string, number>();

  for (const row of rankings ?? []) {
    if (!row.id || !row.genre || !row.language) continue;
    const segment = `${row.language}:${row.genre}`;
    const rank = (nextRankBySegment.get(segment) ?? 0) + 1;
    nextRankBySegment.set(segment, rank);
    lookup.set(row.id, {
      rank,
      uniqueViews: row.unique_views ?? 0,
      uniqueLikes: row.unique_likes ?? 0,
      uniqueCommenters: row.unique_commenters ?? 0,
    });
  }

  return lookup;
}
