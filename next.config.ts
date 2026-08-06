import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Strips the "-my-book-title" SEO slug that book/chapter links now carry
  // (see src/lib/slug.ts) before the request ever reaches the [id]/
  // [chapterId] dynamic routes — so page code and revalidatePath calls keep
  // working against plain ids, completely unaware the slug exists. A UUID
  // is always exactly 36 characters, which is what pins down where the id
  // ends and the slug begins. Links from before this change (bare id, no
  // slug) simply don't match either pattern and fall through unchanged.
  //
  // :slug/:chapterSlug must be given their own `([^/]+)` pattern rather than
  // left unconstrained — path-to-regexp's default pattern for a param right
  // after a literal "-" refuses to let that param's own value contain a "-",
  // which broke every multi-word slug (e.g. "na-garupa-do-besouro" only
  // matched up to "na").
  async rewrites() {
    return [
      {
        source:
          "/:locale(en|pt)/books/:id([0-9a-fA-F-]{36})-:slug([^/]+)/chapters/:chapterId([0-9a-fA-F-]{36})-:chapterSlug([^/]+)",
        destination: "/:locale/books/:id/chapters/:chapterId",
      },
      {
        source: "/:locale(en|pt)/books/:id([0-9a-fA-F-]{36})-:slug([^/]+)",
        destination: "/:locale/books/:id",
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
