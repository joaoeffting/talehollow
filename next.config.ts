import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Matches any Supabase project host, not just this one — avoids a
        // hardcoded project ref that'd silently stop matching after a
        // project migration (e.g. moving to a prod project at launch).
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: {
      // Default is 1MB, tight enough that a normal phone-camera JPEG cover
      // upload (book covers, avatars, external-book covers all go through
      // a Server Action as multipart/form-data) trips it. 5mb is generous
      // for a compressed cover image without reopening the payload-size
      // DoS surface this default exists to bound in the first place.
      bodySizeLimit: "5mb",
    },
  },
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

// withSentryConfig's own job (webpack/turbopack build instrumentation) runs
// unconditionally — that part is safe with no Sentry project configured
// yet. Only the *source map upload* step needs org/project/authToken, and
// Sentry's build tooling skips that step with a warning, not a build
// failure, when they're unset — verified by actually running `next build`
// with none of these set. Fill in SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN
// in .env.local once a real Sentry project exists.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Sentry's own webpack/turbopack plugin normally phones home with
  // anonymous usage stats — off, consistent with everything else in this
  // project only sending data with real, deliberate configuration.
  telemetry: false,
});
