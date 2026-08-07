import { BookListItem } from "@/components/book-list-item";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { withSlug } from "@/lib/slug";
import { getBookRankingsLookup } from "@/lib/book-rankings";
import { getSavedBookIds } from "@/lib/saved-books";
import { genreLabelFor } from "@/components/genre-select";
import { SaveButton } from "@/components/save-button";
import { ContinueReadingSection } from "@/components/continue-reading-section";

const PAGE_SIZE = 20;

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  let contentLanguage = locale;
  if (claims?.claims) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("content_language")
      .eq("id", claims.claims.sub)
      .single();
    contentLanguage = profile?.content_language ?? locale;
  }

  // Fetches one row past the page size so hasNextPage can be read straight
  // off the result length — cheaper than a separate .count() query, and the
  // one extra row is sliced off below before rendering.
  const from = (page - 1) * PAGE_SIZE;
  const { data: booksPlusOne } = await supabase
    .from("books")
    // Explicit FK name — saved_books also links books to profiles now, so
    // an unqualified "profiles(...)" embed is ambiguous (PGRST201).
    .select(
      "id, title, genre, cover_image_url, profiles!books_author_id_fkey(username, display_name)",
    )
    .eq("is_published", true)
    .eq("language", contentLanguage)
    .order("last_pushed_at", { ascending: false })
    .range(from, from + PAGE_SIZE);

  const hasNextPage = (booksPlusOne?.length ?? 0) > PAGE_SIZE;
  const books = booksPlusOne?.slice(0, PAGE_SIZE) ?? [];
  const rankings = await getBookRankingsLookup(supabase);
  const savedBookIds = await getSavedBookIds(supabase, claims?.claims?.sub ?? null);

  return (
    <div className="space-y-6 py-12">
      {/* Reading progress is browser-local only (src/lib/last-read.ts) — this
          only makes sense on the un-paginated main view, not page 2+. */}
      {page === 1 && <ContinueReadingSection />}
      <div>
        <h1 className="text-3xl font-bold">Latest Updates</h1>
        <p className="text-muted-foreground">
          Freshly updated stories, most recent first.
        </p>
      </div>
      <ul className="divide-y rounded border">
        {books.map((book) => {
          const ranking = rankings.get(book.id);
          return (
            <BookListItem
              key={book.id}
              href={`/books/${withSlug(book.id, book.title)}`}
              coverImageUrl={book.cover_image_url}
              title={book.title}
              rankBadge={
                ranking
                  ? { rank: ranking.rank, genreLabel: genreLabelFor(book.genre) }
                  : undefined
              }
              stats={
                ranking
                  ? {
                      views: ranking.uniqueViews,
                      likes: ranking.uniqueLikes,
                      comments: ranking.uniqueCommenters,
                    }
                  : undefined
              }
              meta={
                <>
                  {book.genre} · by{" "}
                  <Link
                    href={`/u/${book.profiles.username}`}
                    className="text-primary underline underline-offset-4 hover:text-accent"
                  >
                    {book.profiles.display_name}
                  </Link>
                </>
              }
              saveButton={
                claims?.claims ? (
                  <SaveButton
                    bookId={book.id}
                    initialIsSaved={savedBookIds.has(book.id)}
                    variant="icon"
                  />
                ) : undefined
              }
            />
          );
        })}
        {books.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            Nothing published yet in this language.
          </li>
        )}
      </ul>
      {(page > 1 || hasNextPage) && (
        <div className="flex justify-between text-sm">
          {page > 1 ? (
            <Link
              href={{ pathname: "/", query: { page: page - 1 } }}
              className="text-primary underline underline-offset-4 hover:text-accent"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {hasNextPage ? (
            <Link
              href={{ pathname: "/", query: { page: page + 1 } }}
              className="text-primary underline underline-offset-4 hover:text-accent"
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
