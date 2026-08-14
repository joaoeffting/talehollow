"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Matches the route handler's own cap (src/app/share-image/route.ts) — kept
// in sync manually since the two can't share a constant across the
// server/client boundary here without a shared module either would need to
// import, which felt like overkill for one number.
const MAX_QUOTE_LENGTH = 400;

type Rect = { top: number; left: number; width: number; height: number };
type SelectedQuote = { text: string; rects: Rect[]; buttonTop: number; buttonLeft: number };

export function ChapterQuoteShare({
  html,
  bookId,
  className,
}: {
  // Already sanitized server-side (sanitizeChapterHtml) before reaching
  // this component — this just renders it, same as the plain div it
  // replaces.
  html: string;
  bookId: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState<SelectedQuote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // The selection-listener effect below runs once ([] deps) — this ref is
  // what lets its event handler see the *current* dialogOpen without
  // re-subscribing listeners on every open/close. Synced via its own
  // effect rather than mutated during render (refs aren't render state).
  const dialogOpenRef = useRef(dialogOpen);
  useEffect(() => {
    dialogOpenRef.current = dialogOpen;
  }, [dialogOpen]);

  useEffect(() => {
    // Checked once the selection is *finalized* (mouseup/touchend/keyup),
    // not on every "selectionchange" — that event fires continuously while
    // the user is still dragging, and re-rendering on each of those ticks
    // was fighting the browser's own native selection painting (the
    // highlight would visibly flicker/vanish mid-drag) and occasionally
    // missing a double-click's word selection, which settles a tick after
    // the events that would otherwise trigger this.
    function handleSelectionEnd(event: Event) {
      // Once the dialog is open, the text has already been handed off —
      // nothing about the underlying page's selection changing should
      // touch `selected` anymore. This matters a lot on mobile
      // specifically: opening the dialog there reliably collapses the
      // real text selection as a side effect (much more aggressively than
      // desktop), and that collapse still fires a touchend/mouseup
      // somewhere outside the button (the backdrop, a focus change,
      // etc.) — without this guard, that stray event nulled `selected`
      // right after the dialog opened, leaving it stuck showing just the
      // header with no image.
      if (dialogOpenRef.current) {
        return;
      }
      // Interacting with our own floating button collapses whatever text
      // was selected (a normal side effect of any click) — without this
      // guard that would null out `selected` a moment before the button's
      // own onClick has a chance to read it.
      if (
        event.target instanceof Node &&
        shareButtonRef.current?.contains(event.target)
      ) {
        return;
      }

      // A tick of slack: some browsers (word/paragraph double- and
      // triple-click in particular) haven't fully settled the Selection
      // object yet at the instant mouseup/touchend fires.
      setTimeout(() => {
        const sel = window.getSelection();
        const container = containerRef.current;
        if (!sel || sel.isCollapsed || !container || sel.rangeCount === 0) {
          setSelected(null);
          return;
        }
        const range = sel.getRangeAt(0);
        if (!container.contains(range.commonAncestorContainer)) {
          setSelected(null);
          return;
        }
        const text = sel.toString().trim();
        if (!text) {
          setSelected(null);
          return;
        }

        // One rect per visual line, captured now — not read live off
        // `window.getSelection()` on every render. React's own selection
        // bookkeeping (it saves/restores focus-adjacent selection state
        // around every commit) clears the *real* browser selection as a
        // side effect of this very setState call, with nothing else on
        // the page needing to change for it to happen. Rendering our own
        // highlight from a snapshot sidesteps that entirely, rather than
        // fighting React for control of window.getSelection().
        const rects = Array.from(range.getClientRects()).map((r) => ({
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
        }));
        if (rects.length === 0) {
          setSelected(null);
          return;
        }
        const firstRect = rects[0];

        setSelected({
          text: text.slice(0, MAX_QUOTE_LENGTH),
          rects,
          buttonTop: firstRect.top - 44,
          buttonLeft: firstRect.left + firstRect.width / 2,
        });
      }, 0);
    }

    document.addEventListener("mouseup", handleSelectionEnd);
    document.addEventListener("touchend", handleSelectionEnd);
    // Covers keyboard-driven selection (e.g. Shift+ArrowRight), which
    // never fires mouseup/touchend at all.
    document.addEventListener("keyup", handleSelectionEnd);
    return () => {
      document.removeEventListener("mouseup", handleSelectionEnd);
      document.removeEventListener("touchend", handleSelectionEnd);
      document.removeEventListener("keyup", handleSelectionEnd);
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className={className} dangerouslySetInnerHTML={{ __html: html }} />

      {selected && !dialogOpen && (
        <>
          {/* Stand-in for the native highlight, which React's own commit
              cycle clears the instant `selected` is set (see the note
              above) — this is what actually stays visible on screen. */}
          {selected.rects.map((rect, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }}
              className="fixed z-40 bg-primary/25"
            />
          ))}
          <button
            ref={shareButtonRef}
            type="button"
            // Captured into state at selection time, so opening the
            // dialog (which can steal focus and collapse the live
            // browser selection anyway) doesn't lose the text this
            // button is for.
            onClick={() => setDialogOpen(true)}
            style={{ top: selected.buttonTop, left: selected.buttonLeft }}
            className="fixed z-50 -translate-x-1/2 rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground shadow-lg"
          >
            Share as image
          </button>
        </>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share this quote</DialogTitle>
          </DialogHeader>
          {selected && <QuoteImagePreview bookId={bookId} text={selected.text} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function QuoteImagePreview({ bookId, text }: { bookId: string; text: string }) {
  const imageUrl = `/share-image?bookId=${encodeURIComponent(bookId)}&text=${encodeURIComponent(text)}`;
  // iOS Safari (and iOS Chrome, which is also WebKit under the hood)
  // ignores the `download` attribute entirely — clicking the <a> just
  // navigates to/opens the image instead of saving it. Feature-detecting
  // the Web Share API and preferring it there isn't just a workaround: it
  // opens the native share sheet, which already has Instagram/X/Save
  // Image built in — a better fit for what this button is for than a
  // manual save-then-upload flow.
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState(false);

  useEffect(() => {
    // Deliberately an effect, not computed during render — `navigator`
    // doesn't exist during SSR, so this must run post-mount (same
    // reasoning as chapter-editor.tsx's draft-recovery check).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- navigator is unavailable during SSR
    setCanShareFiles(
      typeof navigator.share === "function" && typeof navigator.canShare === "function",
    );
  }, []);

  async function handleShare() {
    setSharing(true);
    setShareError(false);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], "talehollow-quote.png", { type: "image/png" });
      if (!navigator.canShare({ files: [file] })) {
        throw new Error("File sharing not supported");
      }
      await navigator.share({ files: [file] });
    } catch (error) {
      // AbortError just means the user closed the native share sheet
      // without picking anything — not a failure worth surfacing.
      if (error instanceof Error && error.name !== "AbortError") {
        setShareError(true);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="space-y-3">
      <img
        src={imageUrl}
        alt="Shareable quote card"
        className="w-full rounded border"
      />
      {canShareFiles ? (
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing}
          className="w-full rounded bg-primary px-4 py-2 text-center text-sm text-primary-foreground disabled:opacity-70"
        >
          {sharing ? "Preparing…" : "Share image"}
        </button>
      ) : (
        <a
          href={imageUrl}
          download="talehollow-quote.png"
          className="block rounded bg-primary px-4 py-2 text-center text-sm text-primary-foreground"
        >
          Save image
        </a>
      )}
      {shareError && (
        <p className="text-sm text-destructive">
          Couldn&apos;t open the share sheet — press and hold the image above to
          save it instead.
        </p>
      )}
    </div>
  );
}
