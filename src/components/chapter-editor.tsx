"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useFormatter } from "next-intl";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  getChapterDraft,
  setChapterDraft,
  clearChapterDraft,
  type ChapterDraft,
} from "@/lib/chapter-draft";

// Title + rich-text content for a chapter, with autosave-to-localStorage and
// draft recovery layered on top. Used by both the per-chapter edit form and
// the new-chapter form — `draftKey` is what keeps their drafts independent
// ("chapter:<id>" vs "new:<bookId>").
export function ChapterEditor({
  draftKey,
  titleDefaultValue = "",
  contentDefaultValue = "",
  onSubmitted,
}: {
  draftKey: string;
  titleDefaultValue?: string;
  contentDefaultValue?: string;
  // Fires once, on the same pending: true -> false edge that clears the
  // local draft below — i.e. right when this editor's form finishes
  // submitting. The new-chapter form uses this to close and reset itself;
  // the per-chapter edit form (which wants to keep showing what was just
  // saved) leaves it unset.
  onSubmitted?: () => void;
}) {
  const [title, setTitle] = useState(titleDefaultValue);
  const [content, setContent] = useState(contentDefaultValue);
  // Bumped on Restore to force RichTextEditor (which only reads its
  // `defaultValue` once, at Tiptap construction) to remount with the
  // restored content instead of the original one.
  const [editorVersion, setEditorVersion] = useState(0);
  const [pendingDraft, setPendingDraft] = useState<ChapterDraft | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const format = useFormatter();

  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  // Deliberately an effect, not a render-time state adjustment — localStorage
  // doesn't exist during SSR, so computing this during render would disagree
  // between the server-rendered HTML and the client's first hydration pass.
  // Deferring to an effect (which never runs during SSR) means the banner
  // only ever appears after mount, avoiding that mismatch. Runs once per
  // mounted editor instance — re-running on every defaultValue change would
  // re-surface a just-dismissed banner.
  useEffect(() => {
    const draft = getChapterDraft(draftKey);
    if (
      draft &&
      (draft.title !== titleDefaultValue || draft.content !== contentDefaultValue)
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above: this must run post-mount, localStorage is unavailable during SSR
      setPendingDraft(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Fires on the pending: true -> false edge, i.e. exactly when this
  // editor's surrounding <form> just finished submitting — same pattern as
  // SaveWithLoading's "just saved" flash. A finished submission means the
  // typed content just made it to the database, so the local draft (whose
  // only job was to survive up to that point) is redundant now.
  useEffect(() => {
    if (wasPending.current && !pending) {
      clearChapterDraft(draftKey);
      onSubmitted?.();
    }
    wasPending.current = pending;
  }, [pending, draftKey, onSubmitted]);

  function scheduleAutosave(nextTitle: string, nextContent: string) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      setChapterDraft(draftKey, {
        title: nextTitle,
        content: nextContent,
        savedAt: new Date().toISOString(),
      });
    }, 1000);
  }

  function restoreDraft() {
    if (!pendingDraft) return;
    setTitle(pendingDraft.title);
    setContent(pendingDraft.content);
    setEditorVersion((v) => v + 1);
    setPendingDraft(null);
  }

  function discardDraft() {
    clearChapterDraft(draftKey);
    setPendingDraft(null);
  }

  return (
    <div className="space-y-2">
      {pendingDraft && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-600 bg-amber-600/5 p-2 text-sm">
          <span>
            Unsaved draft from{" "}
            {format.dateTime(new Date(pendingDraft.savedAt), {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
          <span className="flex gap-3">
            <button
              type="button"
              onClick={restoreDraft}
              className="font-medium text-primary underline underline-offset-4"
            >
              Restore
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="text-muted-foreground underline underline-offset-4"
            >
              Discard
            </button>
          </span>
        </div>
      )}
      <input
        name="title"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          scheduleAutosave(e.target.value, content);
        }}
        placeholder="Chapter title"
        required
        className="w-full rounded border p-2"
      />
      <RichTextEditor
        key={editorVersion}
        name="content"
        defaultValue={content}
        onChange={(html) => {
          setContent(html);
          scheduleAutosave(title, html);
        }}
      />
    </div>
  );
}
