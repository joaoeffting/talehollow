"use client";

import { useState } from "react";
import { RichTextEditor } from "@/components/rich-text-editor";
import { SaveWithLoading } from "@/components/save-with-loading";

export function NewChapterForm({
  action,
}: {
  // A Server Action passed down as a prop — Next.js serializes the
  // reference so this Client Component can call it without needing its own
  // 'use server' file. Kept as its own small Client Component (rather than
  // making the whole page one) purely for the open/closed toggle below —
  // it needs local UI state, and a Server Component can't hold that.
  action: (formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        + New chapter
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded border p-4">
      <h3 className="font-medium">Add chapter</h3>
      <input
        name="title"
        required
        placeholder="Chapter title"
        className="w-full rounded border p-2"
      />
      <RichTextEditor name="content" />
      <div className="flex gap-2">
        <SaveWithLoading label="Add chapter" />
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
