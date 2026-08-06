import { redirect } from "next/navigation";
import { BookOpen, MessageCircle, ThumbsUp, UserPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { withSlug } from "@/lib/slug";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(`/${locale}/login`);

  const { data: notifications } = await supabase
    .from("notifications")
    .select(
      "id, created_at, type, chapter_id, books(id, title), chapters(title), profiles!notifications_actor_id_fkey(username, display_name)",
    )
    .eq("user_id", data.claims.sub) // RLS already restricts to this, but explicit here for clarity
    .order("created_at", { ascending: false });

  // Visiting this page is what "reading" a notification means here — no
  // separate mark-as-read control. This write fires a Postgres change event
  // over the same Realtime subscription the header bell uses, so the badge
  // clears on its own without any extra plumbing back to it.
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", data.claims.sub)
    .is("read_at", null);

  return (
    <div className="space-y-4 py-12">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      <ul className="divide-y rounded border">
        {notifications?.map((n) => {
          const actorLink = (
            <Link
              href={`/u/${n.profiles?.username}`}
              className="text-primary underline underline-offset-4 hover:text-accent"
            >
              {n.profiles?.display_name}
            </Link>
          );
          const bookLink = n.books && (
            <Link
              href={`/books/${withSlug(n.books.id, n.books.title)}`}
              className="text-primary underline underline-offset-4 hover:text-accent"
            >
              {n.books.title}
            </Link>
          );
          // Links straight to the specific chapter that was liked/commented
          // on, not just its book — chapter_id is only ever set for those
          // two notification types, chapter_published still only knows the
          // book.
          const chapterLink = n.books && n.chapter_id && (
            <Link
              href={`/books/${withSlug(n.books.id, n.books.title)}/chapters/${withSlug(n.chapter_id, n.chapters?.title ?? "")}`}
              className="text-primary underline underline-offset-4 hover:text-accent"
            >
              {n.books.title}
            </Link>
          );

          return (
            <li key={n.id} className="flex items-center gap-3 p-4">
              {n.type === "new_follower" && (
                <>
                  <UserPlus
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>{actorLink} started following you</span>
                </>
              )}
              {n.type === "new_like" && (
                <>
                  <ThumbsUp
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-label="Liked"
                  />
                  <span>
                    {actorLink} · {chapterLink}
                  </span>
                </>
              )}
              {n.type === "new_comment" && (
                <>
                  <MessageCircle
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-label="Commented"
                  />
                  <span>
                    {actorLink} · {chapterLink}
                  </span>
                </>
              )}
              {n.type === "chapter_published" && (
                <>
                  <BookOpen
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span>{bookLink} was updated</span>
                </>
              )}
            </li>
          );
        })}
        {notifications?.length === 0 && (
          <li className="p-4 text-sm text-muted-foreground">
            No notifications yet.
          </li>
        )}
      </ul>
    </div>
  );
}
