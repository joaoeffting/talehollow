import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { BookListItem } from "@/components/book-list-item";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login`);

  // No need to also filter `.eq('is_published', ...)` here — RLS's select
  // policy already only returns this author's own rows (published or not)
  // plus nothing belonging to anyone else, since we're filtering by
  // author_id = the signed-in user themselves.
  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("author_id", data.claims.sub)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My books</h1>
        <Link
          href="/dashboard/books/new"
          className="rounded bg-primary px-4 py-2 text-primary-foreground z-10"
        >
          New book
        </Link>
      </div>
      <ul className="divide-y rounded border">
        {books?.map((book) => (
          <BookListItem
            key={book.id}
            href={`/dashboard/books/${book.id}`}
            coverImageUrl={book.cover_image_url}
            title={book.title}
            meta={`${book.genre} · ${book.language.toUpperCase()} · ${book.is_published ? "Published" : "Draft"}`}
            trailing={
              <Link
                href={`/dashboard/books/${book.id}`}
                className="text-sm underline"
              >
                Edit
              </Link>
            }
          />
        ))}
        {books?.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">No books yet.</li>
        )}
      </ul>
    </div>
  );
}
