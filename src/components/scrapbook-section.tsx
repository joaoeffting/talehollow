"use client";

import { useOptimistic, useRef } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ReportButton } from "@/components/report-button";
import { SaveWithLoading } from "@/components/save-with-loading";
import { postScrapbookEntry, deleteScrapbookEntry } from "@/app/[locale]/u/[username]/actions";

type ScrapbookEntry = {
  id: string;
  content: string;
  author_id: string;
  profiles: { username: string; display_name: string };
};

export function ScrapbookSection({
  profileId,
  username,
  locale,
  currentUserId,
  entries,
}: {
  profileId: string;
  username: string;
  locale: string;
  currentUserId: string | null;
  entries: ScrapbookEntry[];
}) {
  const formRef = useRef<HTMLFormElement>(null);

  // Same optimistic-append pattern as CommentSection: show the note the
  // instant the form submits, and let the real row (with its real id) take
  // over once revalidatePath lands and this component re-renders with the
  // fresh `entries` prop.
  const [optimisticEntries, addOptimisticEntry] = useOptimistic(
    entries,
    (state, content: string) => [
      {
        id: `optimistic-${Date.now()}`,
        content,
        author_id: currentUserId ?? "",
        profiles: { username: "", display_name: "You" },
      },
      ...state,
    ],
  );

  async function formAction(formData: FormData) {
    const content = formData.get("content") as string;
    addOptimisticEntry(content);
    formRef.current?.reset();
    await postScrapbookEntry(profileId, username, locale, formData);
  }

  return (
    <section className="space-y-4">
      {currentUserId && (
        <form ref={formRef} action={formAction} className="space-y-2">
          <textarea
            name="content"
            required
            placeholder="Leave a public note"
            className="w-full rounded border p-2"
          />
          <SaveWithLoading label="Post" />
        </form>
      )}

      <ul className="space-y-3">
        {optimisticEntries.map((entry) => {
          // Mirrors the RLS delete policy in the UI: only the poster or the
          // wall owner ever sees a Delete button, so there's no button that
          // just fails silently when clicked.
          const canDelete =
            currentUserId === entry.author_id || currentUserId === profileId;
          // The optimistic placeholder's id isn't a real row id yet — no
          // point offering to report something that doesn't exist server-side.
          const isOptimistic = entry.id.startsWith("optimistic-");
          return (
            <li key={entry.id} className="rounded border p-3">
              <p className="text-sm font-medium">
                {entry.profiles.display_name}
              </p>
              <p>{entry.content}</p>
              <div className="mt-1 flex items-center gap-3">
                {canDelete && (
                  <form
                    action={deleteScrapbookEntry.bind(
                      null,
                      entry.id,
                      username,
                      locale,
                    )}
                  >
                    <ConfirmSubmitButton
                      confirmMessage="Delete this note? This can't be undone."
                      className="flex items-center gap-1 text-xs text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </ConfirmSubmitButton>
                  </form>
                )}
                {currentUserId && !isOptimistic && (
                  <ReportButton
                    targetType="scrapbook_entry"
                    targetId={entry.id}
                    locale={locale}
                  />
                )}
              </div>
            </li>
          );
        })}
        {optimisticEntries.length === 0 && (
          <li className="text-sm text-muted-foreground">
            No notes yet.
          </li>
        )}
      </ul>
    </section>
  );
}
