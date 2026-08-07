"use client";

import { useOptimistic } from "react";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleSave } from "@/app/[locale]/books/actions";

export function SaveButton({
  bookId,
  initialIsSaved,
  // "icon" for tight spaces (list cards); "default" spells out Save/Saved,
  // used on the book detail page next to Like/Report.
  variant = "default",
}: {
  bookId: string;
  initialIsSaved: boolean;
  variant?: "default" | "icon";
}) {
  // Flips instantly on click, same pattern as LikeButton — reconciles back
  // to the real prop once the server action's revalidatePath lands.
  const [isSaved, setOptimisticSaved] = useOptimistic(
    initialIsSaved,
    (_current, next: boolean) => next,
  );

  async function formAction() {
    setOptimisticSaved(!isSaved);
    await toggleSave(bookId);
  }

  return (
    <form action={formAction}>
      <button
        aria-label={isSaved ? "Remove from saved books" : "Save this book"}
        aria-pressed={isSaved}
        className={
          variant === "icon"
            ? "rounded p-1.5 hover:bg-muted"
            : "flex items-center gap-1.5 rounded border px-3 py-1 text-sm"
        }
      >
        <Bookmark
          className={cn("h-4 w-4", isSaved && "fill-current text-primary")}
        />
        {variant === "default" && (isSaved ? "Saved" : "Save")}
      </button>
    </form>
  );
}
