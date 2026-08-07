import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { BookListItem } from "@/components/book-list-item";
import { genreLabelFor } from "@/components/genre-select";
import { withSlug } from "@/lib/slug";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; language: string; genre: string }>;
}): Promise<Metadata> {
  const { locale, language, genre } = await params;
  const genreLabel = genreLabelFor(genre);
  return {
    title: `${genreLabel} rankings (${language.toUpperCase()}) — Storyloom`,
    description: `Top-ranked ${genreLabel} stories in ${language.toUpperCase()} on Storyloom, ranked by unique views, likes, and commenters.`,
    alternates: { canonical: `/${locale}/rankings/${language}/${genre}` },
  };
}

export default async function GenreRankingPage({
  params,
}: {
  params: Promise<{ locale: string; language: string; genre: string }>;
}) {
  const { language, genre } = await params;
  const supabase = await createClient();

  const { data: rankings } = await supabase
    .from("book_rankings")
    .select("*")
    .eq("language", language)
    .eq("genre", genre)
    .order("score", { ascending: false });

  // book_rankings doesn't carry synopsis (it's a stats-only view) — one
  // follow-up query against the real books for just the ids on this page,
  // rather than widening the view for a single display-only field.
  const bookIds = (rankings ?? []).map((book) => book.id).filter((id) => id !== null);
  const { data: synopses } = await supabase
    .from("books")
    .select("id, synopsis")
    .in("id", bookIds);
  const synopsisById = new Map(
    (synopses ?? []).map((book) => [book.id, book.synopsis]),
  );

  const genreLabel = genreLabelFor(genre);

  // score is the ranking formula's internal output, not something readers
  // need next to every entry — kept admin-only, same is_admin check
  // nav-auth-links.tsx uses for the Admin menu. unique_views/likes/commenters
  // are shown to everyone via the stats icons below, same as any other list.
  const { data: claims } = await supabase.auth.getClaims();
  let isAdmin = false;
  if (claims?.claims) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", claims.claims.sub)
      .single();
    isAdmin = profile?.is_admin ?? false;
  }

  return (
    <div className="space-y-6 py-12">
      <h1 className="text-3xl font-bold">
        {genreLabel} rankings ({language.toUpperCase()})
      </h1>
      <ol className="divide-y rounded border">
        {rankings?.map((book, i) => (
          <BookListItem
            key={book.id}
            href={`/books/${withSlug(book.id, book.title)}`}
            coverImageUrl={book.cover_image_url}
            coverSize="lg"
            title={book.title}
            leading={
              <span className="w-8 shrink-0 text-2xl font-bold text-muted-foreground">
                {i + 1}
              </span>
            }
            meta={
              <>
                by{" "}
                <Link
                  href={`/u/${book.username}`}
                  className="text-primary underline underline-offset-4 hover:text-accent"
                >
                  {book.display_name}
                </Link>
              </>
            }
            synopsis={book.id ? synopsisById.get(book.id) ?? undefined : undefined}
            stats={{
              views: book.unique_views ?? 0,
              likes: book.unique_likes ?? 0,
              comments: book.unique_commenters ?? 0,
            }}
            trailing={
              isAdmin ? (
                <p className="shrink-0 text-xs text-muted-foreground">
                  score {book.score}
                </p>
              ) : undefined
            }
          />
        ))}
      </ol>
    </div>
  );
}
