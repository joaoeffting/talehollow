"use client";

import { MoreVertical } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChapterActionsMenu({
  chapterTitle,
  isPublished,
  viewLiveHref,
  onTogglePublished,
  onDelete,
  onMoveUp,
  onMoveDown,
  chapterIndex,
  chapterCount,
}: {
  chapterTitle: string;
  isPublished: boolean;
  // null whenever the chapter/book combination isn't actually live yet (see
  // the "both flags" note below) — left out of the menu entirely rather than
  // shown disabled, so there's nothing to tempt-click that would just 404.
  viewLiveHref: string | null;
  onTogglePublished: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  chapterIndex: number;
  chapterCount: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for "${chapterTitle}"`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <form action={onMoveUp}>
            <button disabled={chapterIndex === 0}>Move up</button>
          </form>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <form action={onMoveDown}>
            <button disabled={chapterIndex === chapterCount - 1}>
              Move down
            </button>
          </form>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onTogglePublished}>
          {isPublished ? "Unpublish" : "Publish"}
        </DropdownMenuItem>
        {viewLiveHref && (
          <DropdownMenuItem
            render={<Link href={viewLiveHref}>View live →</Link>}
          />
        )}
        <DropdownMenuSeparator />
        {/* DropdownMenuItem isn't a real <form>, so there's no submit event
            for a ConfirmSubmitButton (Phase 4) to intercept the way the book
            and cover deletes do — confirm() just gates the direct call to
            onDelete instead, same as nav-menu.tsx calling logout() directly
            from onClick. */}
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => {
            if (confirm(`Delete "${chapterTitle}"? This can't be undone.`))
              onDelete();
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
