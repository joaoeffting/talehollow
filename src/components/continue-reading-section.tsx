"use client";

import { useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { BookCoverThumbnail } from "@/components/book-cover-thumbnail";
import { withSlug } from "@/lib/slug";
import { getAllLastReadSnapshot, subscribeToLastRead } from "@/lib/last-read";

const EMPTY: never[] = [];

// Reading progress only exists in localStorage (see src/lib/last-read.ts) —
// an external store React doesn't own, hence useSyncExternalStore rather
// than useState+useEffect. The empty server snapshot keeps first paint
// matching the server (no hydration mismatch) and means this renders
// nothing at all on someone's very first visit, rather than an empty-state
// placeholder that'd just be dead weight above the actual feed.
export function ContinueReadingSection() {
  const entries = useSyncExternalStore(
    subscribeToLastRead,
    getAllLastReadSnapshot,
    () => EMPTY,
  );

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Continue reading</h2>
      <ul className="flex gap-3 overflow-x-auto pb-2">
        {entries.map((entry) => (
          <li key={entry.bookId} className="w-24 shrink-0">
            <Link
              href={`/books/${withSlug(entry.bookId, entry.bookTitle)}/chapters/${withSlug(entry.chapterId, entry.chapterTitle)}`}
            >
              <BookCoverThumbnail
                coverImageUrl={entry.bookCoverUrl}
                title={entry.bookTitle}
                size="sm"
              />
              <p className="mt-1 line-clamp-2 text-xs font-medium">
                {entry.bookTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                Ch. {entry.position}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
