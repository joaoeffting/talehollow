"use client";

import { useEffect, useId, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/client";

// Shared by every nav element that shows a live unread-notifications badge
// (the header bell, the bottom nav's Notifications icon) — extracted rather
// than duplicated since the Realtime subscription itself, not just the
// number, is real logic worth keeping in one place. `userId` is nullable so
// logged-out callers (the bottom nav renders unconditionally) can call this
// hook too, rather than needing to skip it conditionally.
export function useUnreadNotifications(
  userId: string | null,
  initialUnreadCount: number,
) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const pathname = usePathname();
  // Now mounted twice at once (header bell + bottom nav) — Supabase caches
  // channels by name, so two instances subscribing under the same
  // "notifications-<userId>" name collide ("cannot add postgres_changes
  // callbacks... after subscribe()"). A per-instance id keeps each mounted
  // hook on its own channel.
  // useId()'s own format includes colons (e.g. ":r0:"), which read oddly
  // inside a Realtime topic string — stripped down to the safe characters.
  const instanceId = useId().replace(/[^a-zA-Z0-9]/g, "");

  // Derived at render time rather than via an effect + setState — the
  // notifications page's own logic unconditionally marks everything read on
  // every visit, so as soon as the route is /notifications the true count
  // is 0, no need to wait on the Realtime round trip (client write →
  // Postgres → Realtime broadcast → back to this client) that the
  // subscription below would otherwise eventually deliver it through.
  const displayCount = pathname === "/notifications" ? 0 : unreadCount;

  useEffect(() => {
    if (!userId) return;
    // Narrowed to a const so the closures below (whose calls TypeScript
    // can't tie back to this exact check) still see it as `string`, not
    // `string | null`.
    const currentUserId = userId;
    const supabase = createClient();

    // Re-fetches the exact unread count on every change instead of
    // incrementing/decrementing a running total client-side — the realtime
    // event is just the trigger to recheck, not the source of truth for the
    // number, so this can't drift out of sync with the database.
    async function refreshUnreadCount() {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", currentUserId)
        .is("read_at", null);
      setUnreadCount(count ?? 0);
    }

    const channel = supabase
      .channel(`notifications-${currentUserId}-${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        refreshUnreadCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return displayCount;
}
