// Turns a title into the URL-safe suffix appended after a book/chapter's id
// (e.g. "My Book!" -> "my-book"). Falls back to "untitled" for a title that
// slugifies to nothing (all-emoji, all-punctuation, etc.) — withSlug should
// never emit a bare id with a dangling/missing suffix, since the rewrite
// rules in next.config.ts that strip this suffix always expect one to be
// there.
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "untitled";
}

// Builds the pretty, SEO-friendly path segment for a book or chapter link —
// id first so the rewrite regex can match on it, slug after purely for
// humans/search engines to read. The id is what's actually looked up;
// nothing ever parses the slug back out.
export function withSlug(id: string, title: string): string {
  return `${id}-${slugify(title)}`;
}
