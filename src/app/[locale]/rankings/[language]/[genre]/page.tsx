import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { BookCoverThumbnail } from "@/components/book-cover-thumbnail";
import { GENRES } from "@/components/genre-select";

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

  const genreLabel = GENRES.find((g) => g.value === genre)?.label ?? genre;

  return (
    <div className="space-y-6 py-12">
      <h1 className="text-3xl font-bold">
        {genreLabel} rankings ({language.toUpperCase()})
      </h1>
      <ol className="divide-y rounded border">
        {rankings?.map((book, i) => (
          // Same flex-row-with-thumbnail layout as the discovery feed
          // (Phase 7) — a ranking list is still a list of books, and a bare
          // title/score row was the one place in the app that forgot the
          // cover thumbnail component already existed.
          <li key={book.id} className="flex items-center gap-4 p-4">
            <span className="w-6 shrink-0 text-muted-foreground">#{i + 1}</span>
            <BookCoverThumbnail
              coverImageUrl={book.cover_image_url}
              title={book.title}
            />
            <div className="flex flex-1 items-center justify-between">
              <Link
                href={`/books/${book.id}`}
                className="font-medium text-primary underline underline-offset-4 hover:text-accent"
              >
                {book.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {book.unique_views}v · {book.unique_likes}l ·{" "}
                {book.unique_commenters}c · score {book.score}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
