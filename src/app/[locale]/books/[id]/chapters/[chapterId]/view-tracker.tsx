"use client";

import { useEffect } from "react";
import { recordAnonymousView } from "@/app/[locale]/dashboard/books/actions";

export function ViewTracker({ chapterId }: { chapterId: string }) {
  useEffect(() => {
    const timer = setTimeout(() => recordAnonymousView(chapterId), 4000);
    return () => clearTimeout(timer);
  }, [chapterId]);

  return null;
}
