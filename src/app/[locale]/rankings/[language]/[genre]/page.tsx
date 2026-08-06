import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { BookListItem } from "@/components/book-list-item";
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
          <BookListItem
            key={book.id}
            href={`/books/${book.id}`}
            coverImageUrl={book.cover_image_url}
            title={book.title}
            leading={
              <span className="w-6 shrink-0 text-muted-foreground">
                #{i + 1}
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
            trailing={
              <p className="shrink-0 text-sm text-muted-foreground">
                {book.unique_views}v · {book.unique_likes}l ·{" "}
                {book.unique_commenters}c · score {book.score}
              </p>
            }
          />
        ))}
      </ol>
    </div>
  );
}
