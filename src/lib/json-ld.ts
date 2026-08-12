// JSON.stringify doesn't escape "<", so embedding it straight into a
// dangerouslySetInnerHTML'd <script type="application/ld+json"> is
// injectable: a book/chapter title of `</script><script>...` genuinely
// breaks out of the JSON-LD block and runs as a real script tag for every
// visitor. < is a valid JSON escape for "<" — inert in HTML, but
// JSON.parse (or any real JSON-LD consumer) decodes it right back to "<",
// so this doesn't change what search engines/crawlers actually read.
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
