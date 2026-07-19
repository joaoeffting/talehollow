import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function PublicBookPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Two conditions in the query, not one: RLS already hides unpublished
  // books from other users, but the explicit .eq('is_published', true) here
  // also stops the *author themselves* from landing on their own draft's
  // "public" URL and seeing it rendered as if it were live.
  const { data: book } = await supabase
    .from("books")
    .select("*, profiles(username, display_name)") // join across the author_id -> profiles relationship
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!book) notFound();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, position")
    .eq("book_id", id)
    .eq("is_published", true)
    .order("position");

  return (
    <div className="space-y-6 py-12">
      <div>
        <h1 className="text-3xl font-bold">{book.title}</h1>
        {book.cover_image_url && (
          <img
            src={book.cover_image_url}
            alt={book.title}
            className="w-full max-w-xs rounded"
          />
        )}
        <p className="text-muted-foreground">
          by {book.profiles.display_name} · {book.genre}
        </p>
        <p className="mt-4">{book.synopsis}</p>
      </div>
      <div>
        <h2 className="mb-2 text-xl font-semibold">Chapters</h2>
        <ul className="divide-y rounded border">
          {chapters?.map((chapter) => (
            <li key={chapter.id} className="p-3">
              <Link
                href={`/books/${id}/chapters/${chapter.id}`}
                className="text-primary underline underline-offset-4 hover:text-accent"
              >
                {chapter.position}. {chapter.title}
              </Link>
            </li>
          ))}
          {chapters?.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">
              No chapters published yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
