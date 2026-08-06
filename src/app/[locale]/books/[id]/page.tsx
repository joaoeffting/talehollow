import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { Eye, ThumbsUp, MessageCircle } from "lucide-react";

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

  const { data: viewRows } = await supabase
    .from("views")
    .select("view_count")
    .eq("book_id", id);

  const viewCount = viewRows?.reduce((sum, v) => sum + v.view_count, 0) ?? 0;

  const { data: chapterViews } = await supabase
    .from("chapters")
    .select("anon_view_count")
    .eq("book_id", id)
    .eq("is_published", true);

  const { count: likeCount } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("book_id", id);

  const totalAnonViews =
    chapterViews?.reduce((sum, c) => sum + c.anon_view_count, 0) ?? 0;
  const totalViews = viewCount + totalAnonViews;

  const { count: commentCount } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("book_id", id);

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
          by{" "}
          <Link
            href={`/u/${book.profiles.username}`}
            className="text-primary underline underline-offset-4 hover:text-accent"
          >
            {book.profiles.display_name}
          </Link>{" "}
          · {book.genre}
        </p>
        <p className="mt-4">{book.synopsis}</p>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" aria-hidden="true" />
          {/* "1 views" reads as a typo, not a feature — worth the ternary. */}
          {totalViews} {totalViews === 1 ? "view" : "views"}
        </span>
        <span className="flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          {likeCount ?? 0} {likeCount === 1 ? "like" : "likes"}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {commentCount ?? 0} {commentCount === 1 ? "comment" : "comments"}
        </span>
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
