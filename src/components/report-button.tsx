"use client";

import { useState } from "react";
import { fileReport } from "@/app/[locale]/reports/actions";
import { SaveWithLoading } from "@/components/save-with-loading";

export function ReportButton({
  targetType,
  targetId,
  locale,
}: {
  targetType: "book" | "chapter" | "scrapbook_entry";
  targetId: string;
  locale: string;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-muted-foreground underline"
      >
        Report
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        fileReport(targetType, targetId, locale, formData);
        setOpen(false);
      }}
      className="flex items-center gap-2"
    >
      <input
        name="reason"
        required
        placeholder="Reason"
        className="rounded border p-1 text-xs"
      />
      <SaveWithLoading label="Submit report" />
    </form>
  );
}
