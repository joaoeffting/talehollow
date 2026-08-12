"use client";

import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useUnreadNotifications } from "@/lib/use-unread-notifications";

export function NotificationBell({
  userId,
  initialUnreadCount,
}: {
  userId: string;
  initialUnreadCount: number;
}) {
  const displayCount = useUnreadNotifications(userId, initialUnreadCount);

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
