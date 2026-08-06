import { BookListItem } from "@/components/book-list-item";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { withSlug } from "@/lib/slug";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
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

  const { data: books } = await supabase
    .from("books")
    .select(
      "id, title, genre, cover_image_url, profiles(username, display_name)",
    )
    .eq("is_published", true)
    .eq("language", contentLanguage)

    .order("last_pushed_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6 py-12">
      <div>
        <h1 className="text-3xl font-bold">Latest Updates</h1>
        <p className="text-muted-foreground">
          Freshly updated stories, most recent first.
        </p>
      </div>
      <ul className="divide-y rounded border">
        {books?.map((book) => (
          <BookListItem
            key={book.id}
            href={`/books/${withSlug(book.id, book.title)}`}
            coverImageUrl={book.cover_image_url}
            title={book.title}
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
          />
        ))}
        {books?.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            Nothing published yet in this language.
          </li>
        )}
      </ul>
    </div>
  );
}
