"use client";

import { useOptimistic } from "react";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleLike } from "../../../actions";

export function LikeButton({
  chapterId,
  bookId,
  locale,
  initialCount,
  initialIsLiked,
}: {
  chapterId: string;
  bookId: string;
  locale: string;
  initialCount: number;
  initialIsLiked: boolean;
}) {
  // Flips instantly on click instead of waiting for the server round trip +
  // revalidatePath to refetch the whole page — React reconciles back to the
  // real (initialCount/initialIsLiked) props once that finishes, so a failed
  // mutation just quietly reverts rather than needing manual rollback logic.
  const [state, setOptimisticLike] = useOptimistic(
    { count: initialCount, isLiked: initialIsLiked },
    (current) => ({
      count: current.count + (current.isLiked ? -1 : 1),
      isLiked: !current.isLiked,
    }),
  );

  async function formAction() {
    setOptimisticLike(null);
    await toggleLike(chapterId, bookId, locale);
  }

  return (
    <form action={formAction}>
      <button
        aria-label="Like this chapter"
        aria-pressed={state.isLiked}
        className="flex items-center gap-1.5 rounded border px-3 py-1 text-sm"
      >
        <ThumbsUp
          className={cn("h-4 w-4", state.isLiked && "fill-current text-primary")}
        />
        {state.count}
      </button>
    </form>
  );
}
