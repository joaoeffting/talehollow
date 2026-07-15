"use client";

import { Menu } from "lucide-react";
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
export function NavMenu({ locale }: { locale: string }) {
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
        <DropdownMenuItem
          render={<Link href="/account">Account</Link>}
        ></DropdownMenuItem>
        <DropdownMenuSeparator />
        {/* DropdownMenuItem isn't a real <form>, so the Server Action is
            called directly here rather than via the <form action={...}>
            pattern the account page (below) uses for its own logout button. */}
        <DropdownMenuItem onSelect={() => logout(locale)}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
