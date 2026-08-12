import sanitizeHtml from "sanitize-html";

// Chapter content is stored and rendered as raw HTML (Tiptap's output), and
// Server Actions are just POST endpoints under the hood — nothing stops a
// request from skipping the editor UI entirely and submitting arbitrary
// HTML as `content`. Without this, that's a straight stored-XSS pipeline:
// whatever an "author" submits runs in every reader's browser. Allowlist
// matches exactly what the rich-text editor's toolbar can produce
// (src/components/rich-text-editor.tsx: bold/italic/strike, H2/H3,
// bullet/ordered lists, blockquote, inline code) — nothing else is a
// legitimate use case here, so nothing else is allowed through, regardless
// of what actually gets submitted.
const CHAPTER_HTML_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "h2",
    "h3",
    "strong",
    "em",
    "s",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "br",
  ],
  // No attributes on anything — no class/style/href/on* handlers. There's
  // no legitimate reason chapter prose needs any.
  allowedAttributes: {},
};

// Called from both createChapter/updateChapter (keeps the database itself
// clean) AND the chapter reading page (a defense-in-depth backstop, in case
// content ever reaches this column through a path other than those two
// actions — a future admin tool, a migration, etc.).
export function sanitizeChapterHtml(html: string): string {
  return sanitizeHtml(html, CHAPTER_HTML_OPTIONS);
}
