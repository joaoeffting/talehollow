"use client";

import { Menu, Lightbulb } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/[locale]/login/actions";

// The dropdown needs open/close state, so this piece has to be a Client
// Component — but it stays separate from NavAuthLinks above so that
// component (and its Supabase query) can remain an async Server Component.
//
// Every later phase that needs a new nav destination (Settings in Phase 3,
// Dashboard in Phase 4, Notifications in Phase 15) adds one more
// DropdownMenuItem here instead of a new link in the header.
export function NavMenu({
  locale,
  isAdmin,
}: {
  locale: string;
  isAdmin: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        {/* First, and visually distinct (accent color + icon) — reader/
            author suggestions are explicitly the thing worth surfacing
            hardest here, not just another settings-adjacent link. */}
        <DropdownMenuItem
          render={
            <Link href="/feedback" className="font-medium text-accent">
              <Lightbulb className="h-4 w-4" aria-hidden="true" />
              Share feedback
            </Link>
          }
        ></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/account">Account</Link>}
        ></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/settings">Settings</Link>}
        ></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/dashboard">Author Dashboard</Link>}
        ></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link href="/notifications">Notifications</Link>}
        ></DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href="/admin/reports">Reports (Admin)</Link>}
            ></DropdownMenuItem>
            <DropdownMenuItem
              render={<Link href="/admin/feedback">Feedback (Admin)</Link>}
            ></DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout(locale)}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
