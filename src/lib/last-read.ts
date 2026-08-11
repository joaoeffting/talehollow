// Reading progress lives entirely in the browser — no DB table, no
// cross-device sync. Denormalizing title/cover/position into the stored
// entry (not just ids) means every consumer (the homepage's Continue
// Reading row, the book page's chapter list) can render immediately from
// localStorage alone, with no follow-up fetch needed.
const STORAGE_PREFIX = "storyloom:last-read:";

// The native "storage" event (listened for below) never fires in the tab
// that made the change — only other tabs — so removeLastRead dispatches
// this manually to let same-tab UI (e.g. a remove button in
// ContinueReadingSection) update immediately instead of waiting for a
// remount.
const LOCAL_CHANGE_EVENT = "storyloom:last-read-local-change";

export type LastRead = {
  bookId: string;
  bookTitle: string;
  bookCoverUrl: string | null;
  chapterId: string;
  chapterTitle: string;
  position: number;
  updatedAt: string;
};

export function setLastRead(entry: LastRead) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + entry.bookId, JSON.stringify(entry));
  } catch {
    // localStorage can throw (private browsing, quota) — reading progress
    // is a nice-to-have, not worth crashing the page over.
  }
}

// Lets a reader dismiss a book from the Continue Reading shelf. There's only
// one stored pointer per book (not a full per-chapter history), so this also
// clears whatever Read/Reading badges and "Continue reading Ch. N" button
// ChapterListWithProgress was deriving from it — the correct behavior here,
// not a side effect to work around, since "remove from Continue Reading" and
// "forget my progress on this book" are the same thing for this data model.
export function removeLastRead(bookId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + bookId);
  } catch {
    // See setLastRead above — not worth crashing the page over.
  }
  window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT));
}

// localStorage only fires a native "storage" event in *other* tabs, never
// the one that made the change — fine for LastReadTracker's writes, since
// it lives on the chapter page, a different mounted component than either
// reader below, so a fresh mount already gets a fresh snapshot. removeLastRead
// above needs the same-tab case too (a remove button living right inside
// ContinueReadingSection itself), hence also listening for its manual event.
export function subscribeToLastRead(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LOCAL_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LOCAL_CHANGE_EVENT, callback);
  };
}

// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when nothing has changed, or it re-renders (or loops)
// forever — these two caches compare the raw localStorage string(s) against
// last time and only re-parse (and hand back a new object/array) when the
// underlying data actually changed.
const lastReadCache = new Map<string, { raw: string | null; parsed: LastRead | null }>();

export function getLastReadSnapshot(bookId: string): LastRead | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_PREFIX + bookId);
  const cached = lastReadCache.get(bookId);
  if (cached && cached.raw === raw) return cached.parsed;

  let parsed: LastRead | null = null;
  try {
    parsed = raw ? (JSON.parse(raw) as LastRead) : null;
  } catch {
    parsed = null;
  }
  lastReadCache.set(bookId, { raw, parsed });
  return parsed;
}

let allLastReadCache: { signature: string; parsed: LastRead[] } | null = null;

export function getAllLastReadSnapshot(): LastRead[] {
  if (typeof window === "undefined") return [];

  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  keys.sort();
  const signature = keys.map((key) => `${key}=${localStorage.getItem(key)}`).join("|");

  if (allLastReadCache && allLastReadCache.signature === signature) {
    return allLastReadCache.parsed;
  }

  const entries: LastRead[] = [];
  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      entries.push(JSON.parse(raw) as LastRead);
    } catch {
      continue; // skip a corrupted single entry rather than failing the whole scan
    }
  }
  entries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  allLastReadCache = { signature, parsed: entries };
  return entries;
}
