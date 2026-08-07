import Image from "next/image";
import { BookOpen } from "lucide-react";

const SIZES = {
  // [Tailwind width class, Tailwind height class, pixel width, pixel height]
  // Always a 2:3 book-cover ratio, matching the upload preview convention.
  sm: { className: "h-24 w-16", width: 64, height: 96, iconClassName: "h-6 w-6" },
  lg: { className: "h-36 w-24", width: 96, height: 144, iconClassName: "h-8 w-8" },
} as const;

export function BookCoverThumbnail({
  coverImageUrl,
  title,
  size = "sm",
}: {
  coverImageUrl: string | null;
  title: string;
  size?: keyof typeof SIZES;
}) {
  const { className, width, height, iconClassName } = SIZES[size];

  if (coverImageUrl) {
    return (
      // width/height match the rendered size — next/image needs these to
      // compute lazy-loading/srcset even though the CSS classes are what
      // actually control the displayed box.
      <Image
        src={coverImageUrl}
        alt={`Cover for ${title}`}
        width={width}
        height={height}
        className={`${className} shrink-0 rounded border object-cover`}
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
      className={`flex ${className} shrink-0 items-center justify-center rounded border bg-muted`}
    >
      <BookOpen className={`${iconClassName} text-muted-foreground`} />
    </div>
  );
}
