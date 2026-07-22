import { BookCoverThumbnail } from "@/components/book-cover-thumbnail";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";

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
    .select("id, title, genre, cover_image_url, profiles(display_name)")
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
          <li key={book.id} className="flex gap-4 p-4">
            <BookCoverThumbnail
              coverImageUrl={book.cover_image_url}
              title={book.title}
            />
            <div>
              <Link
                href={`/books/${book.id}`}
                className="font-medium text-primary underline underline-offset-4 hover:text-accent"
              >
                {book.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                {book.genre} · by {book.profiles.display_name}
              </p>
            </div>
          </li>
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
