import type { Metadata } from "next";
import Form from "next/form";
import { BookListItem } from "@/components/book-list-item";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { withSlug } from "@/lib/slug";
import { getBookRankingsLookup } from "@/lib/book-rankings";
import { getSavedBookIds } from "@/lib/saved-books";
import { GenreSelect, genreLabelFor } from "@/components/genre-select";
import { SaveButton } from "@/components/save-button";

const PAGE_SIZE = 20;

export const metadata: Metadata = {
  title: "Search — Storyloom",
};

// .or()'s filter string is raw PostgREST syntax, not a parameterized query —
// unescaped commas/parens in user input would be read as extra filter
// clauses rather than literal search text. Wrapping the value in double
// quotes turns those off; backslash-escaping any backslash/quote already in
// the input keeps that quoting itself from being broken out of.
// https://postgrest.org/en/stable/references/api/tables_views.html#reserved-characters
function escapeForPostgrestOr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; genre?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { q, genre, page: pageParam } = await searchParams;
  const query = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);
  const hasFilters = query.length > 0 || !!genre;

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

  let books: {
    id: string;
    title: string;
    genre: string;
    cover_image_url: string | null;
    profiles: { username: string; display_name: string | null };
  }[] = [];
  let hasNextPage = false;

  if (hasFilters) {
    const from = (page - 1) * PAGE_SIZE;
    let dbQuery = supabase
      .from("books")
      .select(
        "id, title, genre, cover_image_url, profiles!books_author_id_fkey(username, display_name)",
      )
      .eq("is_published", true)
      .eq("language", contentLanguage);

    if (query) {
      const pattern = `%${escapeForPostgrestOr(query)}%`;
      dbQuery = dbQuery.or(`title.ilike."${pattern}",synopsis.ilike."${pattern}"`);
    }
    if (genre) dbQuery = dbQuery.eq("genre", genre);

    const { data: booksPlusOne } = await dbQuery
      .order("last_pushed_at", { ascending: false })
      .range(from, from + PAGE_SIZE);

    hasNextPage = (booksPlusOne?.length ?? 0) > PAGE_SIZE;
    books = booksPlusOne?.slice(0, PAGE_SIZE) ?? [];
  }

  const rankings = hasFilters
    ? await getBookRankingsLookup(supabase)
    : new Map();
  const savedBookIds = await getSavedBookIds(supabase, claims?.claims?.sub ?? null);

  return (
    <div className="space-y-6 py-12">
      <div>
        <h1 className="text-3xl font-bold">Search</h1>
        <p className="text-muted-foreground">
          Find a story by title, optionally narrowed by genre.
        </p>
      </div>
      <Form action="" className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search by title"
          className="min-w-0 flex-1 rounded border p-2"
        />
        <GenreSelect
          defaultValue={genre}
          allowAll
          className="rounded border p-2"
        />
        <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
          Search
        </button>
      </Form>

      {!hasFilters ? (
        <p className="text-sm text-muted-foreground">
          Enter a title or pick a genre to see results.
        </p>
      ) : (
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
                    {genreLabelFor(book.genre)} · by{" "}
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
              No stories found in your language for this search.
            </li>
          )}
        </ul>
      )}

      {hasFilters && (page > 1 || hasNextPage) && (
        <div className="flex justify-between text-sm">
          {page > 1 ? (
            <Link
              href={{
                pathname: "/search",
                query: { q: query || undefined, genre: genre || undefined, page: page - 1 },
              }}
              className="text-primary underline underline-offset-4 hover:text-accent"
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          {hasNextPage ? (
            <Link
              href={{
                pathname: "/search",
                query: { q: query || undefined, genre: genre || undefined, page: page + 1 },
              }}
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
