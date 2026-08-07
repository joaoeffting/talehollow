import Image from "next/image";
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
      // width/height match the rendered size (w-16/h-24 = 64x96px) — next/image
      // needs these to compute lazy-loading/srcset even though the CSS classes
      // are what actually control the displayed box.
      <Image
        src={coverImageUrl}
        alt={`Cover for ${title}`}
        width={64}
        height={96}
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
