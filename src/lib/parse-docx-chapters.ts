// Splits mammoth's HTML output on Word's "Heading 1" style (which mammoth
// maps to <h1> by default) — each heading becomes a chapter title, and
// everything until the next heading becomes that chapter's body. A plain
// string split rather than a real DOM parser: mammoth's output is
// well-formed, predictable HTML, and pulling in a DOM parser (jsdom or
// similar) for this one narrow, controlled shape isn't worth the
// dependency.
export function splitIntoChapters(html: string): {
  chapters: { title: string; contentHtml: string }[];
  frontMatterHtml: string;
} {
  // Capturing group inside split() keeps the delimiters in the result,
  // interleaved: [beforeFirstHeading, h1Tag, textBetween, h1Tag, ...].
  // [^>]* (not attribute-free <h1>) — mammoth doesn't emit attributes on
  // headings by default, but nothing guarantees that stays true.
  const parts = html.split(/(<h1[^>]*>[\s\S]*?<\/h1>)/);

  const frontMatterHtml = (parts[0] ?? "").trim();
  const chapters: { title: string; contentHtml: string }[] = [];

  for (let i = 1; i < parts.length; i += 2) {
    const headingHtml = parts[i] ?? "";
    const title = headingHtml
      .replace(/<[^>]+>/g, "")
      .trim();
    const contentHtml = (parts[i + 1] ?? "").trim();
    chapters.push({
      title: title || `Chapter ${chapters.length + 1}`,
      contentHtml,
    });
  }

  return { chapters, frontMatterHtml };
}
