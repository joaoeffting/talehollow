import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  const supabase = await createClient();

  // Fetch the whole published chapter list (not just this one chapter) so
  // we can compute prev/next by array position, rather than issuing two
  // extra queries for "the chapter before/after this position."
  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, content, position")
    .eq("book_id", id)
    .eq("is_published", true)
    .order("position");

  const index = chapters?.findIndex((c) => c.id === chapterId) ?? -1;
  if (index === -1 || !chapters) notFound();

  const chapter = chapters[index];
  const prev = chapters[index - 1]; // undefined if this is the first chapter
  const next = chapters[index + 1]; // undefined if this is the last chapter

  return (
    <article className="space-y-6 py-6">
      <Link
        href={`/books/${id}`}
        className="text-md text-muted-foreground underline underline-offset-4 hover:text-accent"
      >
        ← Go back to book
      </Link>
      <h1 className="text-2xl font-semibold mt-5">{chapter.title}</h1>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: chapter.content ?? "" }}
      />
      <div className="flex justify-between border-t pt-4 text-sm">
        {prev ? (
          <Link
            href={`/books/${id}/chapters/${prev.id}`}
            className="text-primary underline underline-offset-4 hover:text-accent"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/books/${id}/chapters/${next.id}`}
            className="text-primary underline underline-offset-4 hover:text-accent"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}
