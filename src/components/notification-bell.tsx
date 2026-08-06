"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/client";

export function NotificationBell({
  userId,
  initialUnreadCount,
}: {
  userId: string;
  initialUnreadCount: number;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const pathname = usePathname();

  // Derived at render time rather than via an effect + setState — the
  // notifications page's own logic unconditionally marks everything read on
  // every visit, so as soon as the route is /notifications the true count
  // is 0, no need to wait on the Realtime round trip (client write →
  // Postgres → Realtime broadcast → back to this client) that the
  // subscription below would otherwise eventually deliver it through.
  const displayCount = pathname === "/notifications" ? 0 : unreadCount;

  useEffect(() => {
    const supabase = createClient();

    // Re-fetches the exact unread count on every change instead of
    // incrementing/decrementing a running total client-side — the realtime
    // event is just the trigger to recheck, not the source of truth for the
    // number, so this can't drift out of sync with the database.
    async function refreshUnreadCount() {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      setUnreadCount(count ?? 0);
    }

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        refreshUnreadCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <Link href="/notifications" aria-label="Notifications" className="relative">
      <Bell className="h-5 w-5" />
      {displayCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
          {displayCount > 9 ? "9+" : displayCount}
        </span>
      )}
    </Link>
  );
}
