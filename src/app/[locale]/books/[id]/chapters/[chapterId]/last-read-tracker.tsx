"use client";

import { useEffect } from "react";
import { setLastRead } from "@/lib/last-read";

// Records "this is the chapter I was last reading" to localStorage on every
// visit, logged in or not — same reasoning as ViewTracker, but this one has
// nothing to do with the server: it exists purely to power the client-side
// Continue Reading affordances on the homepage and book page.
export function LastReadTracker({
  bookId,
  bookTitle,
  bookCoverUrl,
  chapterId,
  chapterTitle,
  position,
}: {
  bookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  chapterId: string;
  chapterTitle: string;
  position: number;
}) {
  useEffect(() => {
    setLastRead({
      bookId,
      bookTitle,
      bookCoverUrl,
      chapterId,
      chapterTitle,
      position,
      updatedAt: new Date().toISOString(),
    });
  }, [bookId, bookTitle, bookCoverUrl, chapterId, chapterTitle, position]);

  return null;
}
