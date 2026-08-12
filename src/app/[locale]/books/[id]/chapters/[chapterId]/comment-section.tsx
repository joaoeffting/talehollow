"use client";

import { useOptimistic, useRef } from "react";
import { useFormatter } from "next-intl";
import { MessageCircle, Send, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { postComment, deleteComment } from "../../../actions";

type Comment = {
  id: string;
  content: string;
  created_at: string | null;
  user_id: string;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
};

export function CommentSection({
  chapterId,
  bookId,
  locale,
  currentUserId,
  comments,
}: {
  chapterId: string;
  bookId: string;
  locale: string;
  currentUserId: string | null;
  comments: Comment[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const format = useFormatter();

  // Appends a placeholder comment the instant the form submits, rather than
  // waiting for the insert + revalidatePath round trip. The real row (with
  // its real id) takes over automatically once revalidation lands and this
  // component re-renders with the fresh `comments` prop — no manual
  // reconciliation needed, same pattern as the like button.
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (state, content: string) => [
      {
        id: `optimistic-${Date.now()}`,
        content,
        created_at: new Date().toISOString(),
        user_id: currentUserId ?? "",
        profiles: { username: "", display_name: "You", avatar_url: null },
      },
      ...state,
    ],
  );

  // Distinct-commenter count is computed off the real `comments` prop, not
  // `optimisticComments` — an in-flight optimistic post from the current
  // user shouldn't be able to bump this number before the server confirms
  // it (they may already be counted from an earlier comment on this chapter).
  const distinctCommenters = new Set(comments.map((c) => c.user_id)).size;

  async function formAction(formData: FormData) {
    const content = formData.get("content") as string;
    addOptimisticComment(content);
    formRef.current?.reset();
    await postComment(chapterId, bookId, locale, formData);
  }

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        Comments ({optimisticComments.length}) · {distinctCommenters} people
        commenting
      </h2>

      {currentUserId && (
        <form ref={formRef} action={formAction} className="space-y-2">
          <textarea
            name="content"
            required
            placeholder="Add a comment"
            className="w-full rounded border p-2"
          />
          <button className="flex items-center gap-1.5 rounded bg-primary px-3 py-1 text-sm text-primary-foreground">
            <Send className="h-4 w-4" aria-hidden="true" />
            Post
          </button>
        </form>
      )}

      <ul className="space-y-3">
        {optimisticComments.map((comment) => {
          // display_name can be null (never set) — same fallback-to-username
          // pattern used elsewhere in the app (e.g. nav-auth-links.tsx).
          const displayName =
            comment.profiles.display_name ?? comment.profiles.username;
          const initials = displayName.slice(0, 2).toUpperCase();
          return (
            <li key={comment.id} className="flex gap-3 rounded border p-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage
                  src={comment.profiles.avatar_url ?? undefined}
                  alt={displayName}
                />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="flex items-baseline gap-2 text-sm font-medium">
                  {/* No username yet on the optimistic placeholder (it only
                    knows "You" until the real row lands) — plain text
                    instead of a link so there's nothing to click through to
                    a broken /u/ page in that brief window. */}
                  {comment.profiles.username ? (
                    <Link
                      href={`/u/${comment.profiles.username}`}
                      className="hover:underline"
                    >
                      {displayName}
                    </Link>
                  ) : (
                    displayName
                  )}
                  <span className="text-xs font-normal text-muted-foreground">
                    {comment.created_at &&
                      format.dateTime(new Date(comment.created_at), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                  </span>
                </p>
                <p>{comment.content}</p>
                {/* Only the comment's own author ever sees a Delete button —
                  RLS would block anyone else's attempt anyway, but the UI
                  shouldn't offer an action it knows will silently fail. */}
                {comment.user_id === currentUserId && (
                  <form
                    action={deleteComment.bind(
                      null,
                      comment.id,
                      chapterId,
                      bookId,
                      locale,
                    )}
                  >
                    <ConfirmSubmitButton
                      confirmMessage="Delete this comment? This can't be undone."
                      className="mt-1 flex items-center gap-1 text-xs text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
