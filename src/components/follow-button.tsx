"use client";

import { useOptimistic } from "react";
import { toggleFollow } from "@/app/[locale]/u/[username]/actions";

export function FollowButton({
  followedId,
  username,
  locale,
  initialIsFollowing,
}: {
  followedId: string;
  username: string;
  locale: string;
  initialIsFollowing: boolean;
}) {
  // Same instant-flip-then-reconcile pattern as LikeButton — the UI flips
  // on click, and settles back to the real `initialIsFollowing` prop once
  // the mutation + revalidatePath round trip finishes.
  const [isFollowing, setOptimisticFollow] = useOptimistic(
    initialIsFollowing,
    (current) => !current,
  );

  async function formAction() {
    setOptimisticFollow(null);
    await toggleFollow(followedId, username, locale);
  }

  return (
    <form action={formAction}>
      <button
        className={
          isFollowing
            ? "rounded border px-3 py-1 text-sm"
            : "rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
        }
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    </form>
  );
}
