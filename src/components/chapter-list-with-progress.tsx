"use client";

import { useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import { withSlug } from "@/lib/slug";
import { getLastReadSnapshot, subscribeToLastRead } from "@/lib/last-read";

type Chapter = { id: string; title: string; position: number };

export function ChapterListWithProgress({
  bookId,
  bookTitle,
  chapters,
}: {
  bookId: string;
  bookTitle: string;
  chapters: Chapter[];
}) {
  // localStorage is an external store React doesn't own, so this reads it
  // via useSyncExternalStore rather than useState+useEffect — the null
  // server snapshot keeps first paint matching the server (no hydration
  // mismatch), and the Read/Reading labels/Continue button fill in right after.
  const lastRead = useSyncExternalStore(
    subscribeToLastRead,
    () => getLastReadSnapshot(bookId),
    () => null,
  );

  const continueChapter = lastRead
    ? chapters.find((c) => c.id === lastRead.chapterId)
    : undefined;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Chapters</h2>
        {continueChapter && (
          <Link
            href={`/books/${withSlug(bookId, bookTitle)}/chapters/${withSlug(continueChapter.id, continueChapter.title)}`}
            className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
          >
            Continue reading Ch. {continueChapter.position}
          </Link>
        )}
      </div>
      <ul className="divide-y rounded border">
        {chapters.map((chapter) => {
          // No status shown for chapters never opened yet — only reachable
          // once there's a lastRead entry to compare against at all. A
          // chapter is "Reading" only while it's the most recent one opened;
          // it becomes "Read" the moment a later chapter is opened instead
          // (there's no way to detect "actually finished," so this is the
          // closest honest signal: did they move past it or not).
          const status =
            lastRead && chapter.position < lastRead.position
              ? "Read"
              : lastRead && chapter.id === lastRead.chapterId
                ? "Reading"
                : null;
          return (
            <li key={chapter.id} className="flex items-center justify-between p-3">
              <Link
                href={`/books/${withSlug(bookId, bookTitle)}/chapters/${withSlug(chapter.id, chapter.title)}`}
                className="text-primary underline underline-offset-4 hover:text-accent"
              >
                {chapter.position}. {chapter.title}
              </Link>
              {status && (
                <span className="text-xs text-muted-foreground">{status}</span>
              )}
            </li>
          );
        })}
        {chapters.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">
            No chapters published yet.
          </li>
        )}
      </ul>
    </div>
  );
}
