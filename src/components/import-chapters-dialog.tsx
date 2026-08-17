"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  parseDocxForImport,
  importChapters,
  type ParsedChapter,
} from "@/app/[locale]/dashboard/books/[id]/chapters/actions";

// Each parsed chapter carries its own `included` + editable `title` —
// letting the author drop a misdetected split or fix a heading typo
// before anything is saved, rather than trusting the parse blind.
type Draft = ParsedChapter & { included: boolean };

export function ImportChaptersDialog({
  bookId,
  locale,
}: {
  bookId: string;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [hadFrontMatter, setHadFrontMatter] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  function reset() {
    setParsing(false);
    setParseError(null);
    setDrafts(null);
    setHadFrontMatter(false);
    setImporting(false);
    setImportError(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets picking the same file twice re-trigger onChange
    if (!file) return;

    setParsing(true);
    setParseError(null);
    setDrafts(null);

    const formData = new FormData();
    formData.append("file", file);
    const result = await parseDocxForImport(formData);
    setParsing(false);

    if (!result.ok) {
      setParseError(result.error);
      return;
    }
    setDrafts(result.chapters.map((c) => ({ ...c, included: true })));
    setHadFrontMatter(result.hadFrontMatter);
  }

  async function handleImport() {
    if (!drafts) return;
    const included = drafts.filter((d) => d.included);
    if (included.length === 0) return;

    setImporting(true);
    setImportError(null);
    const result = await importChapters(
      bookId,
      locale,
      included.map((d) => ({ title: d.title, contentHtml: d.contentHtml })),
    );
    setImporting(false);

    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setOpen(false);
    reset();
  }

  const includedCount = drafts?.filter((d) => d.included).length ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded border px-3 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Upload className="h-3.5 w-3.5" aria-hidden="true" />
        Import from Word doc
      </button>

      <DialogContent className="min-w-0 max-w-lg">
        <DialogHeader>
          <DialogTitle>Import chapters from a Word document</DialogTitle>
        </DialogHeader>

        {!drafts && (
          <div className="min-w-0 space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a .docx file. Each chapter title needs to use Word&apos;s
              &quot;Heading 1&quot; style — everything after one heading and
              before the next becomes that chapter&apos;s text.
            </p>
            <Input
              type="file"
              accept=".docx"
              disabled={parsing}
              onChange={handleFileChange}
            />
            {parsing && (
              <p className="text-sm text-muted-foreground">Reading document…</p>
            )}
            {parseError && (
              <p className="text-sm text-destructive">{parseError}</p>
            )}
          </div>
        )}

        {drafts && (
          <div className="min-w-0 space-y-3">
            {hadFrontMatter && (
              <p className="rounded border border-amber-600 bg-amber-600/5 p-2 text-sm">
                There&apos;s text before the first heading in this document
                (a title page, table of contents, etc.) — it won&apos;t be
                imported.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Found {drafts.length} chapter{drafts.length === 1 ? "" : "s"}.
              Uncheck any that got split wrong, or fix a title, before
              importing.
            </p>
            <ul className="min-w-0 max-h-80 space-y-2 overflow-y-auto">
              {drafts.map((draft, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded border p-2"
                >
                  <input
                    type="checkbox"
                    checked={draft.included}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev
                          ? prev.map((d, di) =>
                              di === i
                                ? { ...d, included: e.target.checked }
                                : d,
                            )
                          : prev,
                      )
                    }
                    className="mt-2.5"
                    aria-label={`Include "${draft.title}"`}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Input
                      value={draft.title}
                      disabled={!draft.included}
                      onChange={(e) =>
                        setDrafts((prev) =>
                          prev
                            ? prev.map((d, di) =>
                                di === i
                                  ? { ...d, title: e.target.value }
                                  : d,
                              )
                            : prev,
                        )
                      }
                      className="text-sm font-medium"
                    />
                    <p className="truncate text-xs text-muted-foreground">
                      {draft.excerpt || "(empty)"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleImport}
                disabled={importing || includedCount === 0}
                className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-70"
              >
                {importing
                  ? "Importing…"
                  : `Import ${includedCount} chapter${includedCount === 1 ? "" : "s"}`}
              </button>
              <button
                type="button"
                onClick={reset}
                disabled={importing}
                className="text-sm text-muted-foreground"
              >
                Choose a different file
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
