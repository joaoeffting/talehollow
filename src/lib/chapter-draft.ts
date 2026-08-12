// Chapter drafts live entirely in the browser — same reasoning as
// last-read.ts: no DB round trip needed, and this is exactly the kind of
// data that should survive a crashed tab/browser without ever having been
// explicitly saved. Keyed by "chapter:<id>" for existing chapters or
// "new:<bookId>" for the still-unsaved new-chapter form, so each editor
// instance on the page gets its own independent draft slot.
const STORAGE_PREFIX = "storyloom:chapter-draft:";

export type ChapterDraft = {
  title: string;
  content: string;
  savedAt: string;
};

export function getChapterDraft(key: string): ChapterDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? (JSON.parse(raw) as ChapterDraft) : null;
  } catch {
    // Corrupt JSON or localStorage unavailable (private browsing, quota) —
    // treat it the same as "no draft" rather than crashing the editor.
    return null;
  }
}

export function setChapterDraft(key: string, draft: ChapterDraft) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(draft));
  } catch {
    // Same as above — a failed autosave shouldn't surface as a user-facing
    // error, the in-editor content itself is untouched either way.
  }
}

export function clearChapterDraft(key: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_PREFIX + key);
}
