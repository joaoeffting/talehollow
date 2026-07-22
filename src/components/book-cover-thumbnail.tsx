import { BookOpen } from "lucide-react";

export function BookCoverThumbnail({
  coverImageUrl,
  title,
}: {
  coverImageUrl: string | null;
  title: string;
}) {
  if (coverImageUrl) {
    return (
      // Plain <img>, matching Phase 4's CoverInput — same reasoning: a
      // next/image remote-pattern entry for the Supabase Storage domain
      // isn't worth configuring for a v1 thumbnail.
      <img
        src={coverImageUrl}
        alt={`Cover for ${title}`}
        className="h-24 w-16 shrink-0 rounded border object-cover"
      />
    );
  }

  // No cover uploaded — a plain gray box with a book icon instead of just
  // leaving blank space, so the feed still reads as a list of books at a
  // glance even before any author has bothered with cover art.
  return (
    <div
      role="img"
      aria-label={`No cover image for ${title}`}
      className="flex h-24 w-16 shrink-0 items-center justify-center rounded border bg-muted"
    >
      <BookOpen className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}
