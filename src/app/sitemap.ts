import type { MetadataRoute } from "next";
import { createClient } from "@/utils/supabase/server";
import { withSlug } from "@/lib/slug";
import { SITE_URL } from "@/lib/site";

// Next.js auto-serves this at /sitemap.xml — no route file needed beyond
// this. Queries every published book/chapter directly (not the capped,
// most-recent feed or any paginated UI), so crawlability here doesn't
// depend on how deep a crawler follows in-app links.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  // Only published books/chapters belong in the sitemap. English-only for
  // now, matching the "infra ready, content English-only for now" scope
  // from Phase 1 — once messages/pt.json ships, loop over routing.locales
  // (src/i18n/routing.ts) and emit one URL per book/chapter per locale.
  const { data: books } = await supabase
    .from("books")
    .select("id, title, chapters(id, title, is_published)")
    .eq("is_published", true)
    .eq("language", "en");

  const bookUrls = (books ?? []).map((book) => ({
    url: `${SITE_URL}/en/books/${withSlug(book.id, book.title)}`,
    lastModified: new Date(),
  }));

  const chapterUrls = (books ?? []).flatMap((book) =>
    book.chapters
      .filter((chapter) => chapter.is_published)
      .map((chapter) => ({
        url: `${SITE_URL}/en/books/${withSlug(book.id, book.title)}/chapters/${withSlug(chapter.id, chapter.title)}`,
        lastModified: new Date(),
      })),
  );

  return [
    { url: `${SITE_URL}/en`, lastModified: new Date() },
    ...bookUrls,
    ...chapterUrls,
  ];
}
