import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { ViewTracker } from "./view-tracker";
import { LikeButton } from "./like-button";
import { CommentSection } from "./comment-section";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; chapterId: string }>;
}) {
  const { id, chapterId, locale } = await params;
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (claims?.claims) {
    await supabase.rpc("record_view", {
      p_chapter_id: chapterId,
      p_book_id: id,
    });
  }

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

  const { count: chapterLikeCount } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  // Only worth checking "did I like this" for a signed-in viewer — the
  // toggle action itself is a no-op for logged-out visitors.
  let isLiked = false;
  if (claims?.claims) {
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("chapter_id", chapterId)
      .eq("user_id", claims.claims.sub)
      .maybeSingle();
    isLiked = !!existingLike;
  }

  const chapter = chapters[index];
  const prev = chapters[index - 1]; // undefined if this is the first chapter
  const next = chapters[index + 1]; // undefined if this is the last chapter

  const { data: comments } = await supabase
    .from("comments")
    .select(
      "id, content, created_at, user_id, profiles(username, display_name)",
    )
    .eq("chapter_id", chapter.id)
    .order("created_at", { ascending: false });

  return (
    <article className="space-y-6 py-6">
      {!claims?.claims && <ViewTracker chapterId={chapter.id} />}
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
      <LikeButton
        chapterId={chapter.id}
        bookId={id}
        locale={locale}
        initialCount={chapterLikeCount ?? 0}
        initialIsLiked={isLiked}
      />
      <CommentSection
        chapterId={chapter.id}
        bookId={id}
        locale={locale}
        currentUserId={claims?.claims?.sub ?? null}
        comments={comments ?? []}
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
