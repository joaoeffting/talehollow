"use client";

import { useSearchParams } from "next/navigation";
import { Home, Search, Plus, Bell, Bookmark } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { useUnreadNotifications } from "@/lib/use-unread-notifications";

// Icon-only quick-nav bar — a second, faster path to the same few
// destinations the header/hamburger already cover, not a replacement for
// either. Shown at every screen size by design (not just phone widths).
export function BottomNavBar({
  isLoggedIn,
  userId,
  username,
  initialUnreadCount = 0,
}: {
  isLoggedIn: boolean;
  userId?: string;
  username?: string;
  initialUnreadCount?: number;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const unreadCount = useUnreadNotifications(userId ?? null, initialUnreadCount);

  const savedHref = isLoggedIn && username ? `/u/${username}?tab=saved` : "/login";
  const createHref = isLoggedIn ? "/dashboard/books/new" : "/login";
  const notificationsHref = isLoggedIn ? "/notifications" : "/login";

  const isSavedActive =
    isLoggedIn &&
    !!username &&
    pathname === `/u/${username}` &&
    searchParams.get("tab") === "saved";

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-around">
        <NavIcon href="/" label="Home" active={pathname === "/"}>
          <Home className="h-5 w-5" aria-hidden="true" />
        </NavIcon>
        <NavIcon href="/search" label="Search" active={pathname === "/search"}>
          <Search className="h-5 w-5" aria-hidden="true" />
        </NavIcon>
        <Link
          href={createHref}
          aria-label="New book"
          className="-translate-y-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        >
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
        <NavIcon
          href={notificationsHref}
          label="Notifications"
          active={pathname === "/notifications"}
        >
          <span className="relative">
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
        </NavIcon>
        <NavIcon href={savedHref} label="Saved" active={isSavedActive}>
          <Bookmark className="h-5 w-5" aria-hidden="true" />
        </NavIcon>
      </div>
    </nav>
  );
}

function NavIcon({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="flex h-14 w-11 flex-none flex-col items-center justify-center gap-1"
    >
      <span
        className={`flex h-8 w-10 items-center justify-center rounded-full transition-colors ${
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground"
        }`}
      >
        {children}
      </span>
      <span
        className={`h-1 w-1 rounded-full transition-colors ${
          active ? "bg-primary" : "bg-transparent"
        }`}
        aria-hidden="true"
      />
    </Link>
  );
}
