# Talehollow

A community platform for serialized fiction — authors publish books made up of
chapters, readers discover, follow, and engage with them through views, likes,
comments, and public profile activity. Built as a Wattpad-style platform, with a
calmer, ad-light reading experience as the explicit positioning against it.

**Live at:** [talehollow.app](https://talehollow.app)

## What's actually built

- **Auth** — signup/login split into separate tabs, password reset via a
  `token_hash`-based confirm route (deliberately not Supabase's default PKCE
  `code` exchange, which breaks when a reset link is opened on a different
  device than the one that requested it), Cloudflare Turnstile CAPTCHA on
  login/signup/reset, and self-service account deletion.
- **Authoring** — draft/published books and chapters, a rich-text chapter
  editor, cover image upload.
- **Discovery** — a chronological "Latest Updates" feed (filtered by the
  reader's content-language preference, independent of the site's own UI
  language), title/synopsis search with genre filtering, and per-genre
  rankings driven by a unique-user engagement score, not raw event counts.
- **Anti-spam by design** — views, likes, and feed pushes all count *distinct
  users*, not events, so one person refreshing/spamming can't inflate a
  ranking or repeatedly jump a book back to the top of the feed. Covered by
  a Playwright integration test suite (`npm run test:e2e`), not just
  RLS/schema-level trust.
- **Social** — follows, throttled notifications, public profiles with inline
  editing, a public "scrapbook" wall, save-for-later, an author book
  showcase for work published elsewhere, and browser-local "continue
  reading" progress.
- **Share as image** — select any passage of a chapter and generate a
  branded, downloadable quote card (book cover background, the excerpt,
  attribution, a site-URL footer) sized for Instagram/X, server-rendered
  on demand via `next/og`'s `ImageResponse`.
- **Moderation** — a report affordance on books/chapters/scrapbook entries,
  with an admin review page.
- **SEO** — per-page metadata, Open Graph, canonical URLs, sitemap/robots,
  and JSON-LD structured data on book/chapter pages.
- **i18n** — locale-prefixed routing (`next-intl`), with content language
  (which language of stories you read) kept as a separate axis from UI
  language (which language the site's own chrome is in).
- **Legal** — Terms of Service and Privacy Policy pages, written for GDPR
  regardless of visitor location (the operator's own jurisdiction alone
  already triggers it).

## Tech stack

Next.js (App Router), Supabase (Postgres, Auth, Row Level Security, Storage),
TypeScript, Tailwind CSS, shadcn/ui, next-intl, Cloudflare Turnstile, PostHog,
deployed on Vercel.

## Notable engineering decisions

A few things worth a closer look in the code, not just the feature list:

- **Row Level Security carries real policy weight** — not just "a user sees
  their own rows," but ownership (authors own their books/chapters),
  visibility gated by draft/published state, and deliberately public social
  writes (comments, scrapbook posts).
- **Account deletion required a coordinated Postgres function, not a plain
  delete** — almost none of the tables referencing a user cascade
  automatically, so `delete_own_account()` (see `supabase-account-deletion.sql`)
  is a `security definer` function that deletes everything in the correct
  dependency order in one transaction. Verified end-to-end against the real
  database in an isolated environment before shipping — that process caught
  a real foreign-key gap (`notifications.actor_id`, added after the schema's
  original design) that a naive implementation would have missed.
- **Engagement scoring is unique-user-based everywhere it matters** — the
  ranking formula, the feed-push throttle, and notification dispatch all key
  off distinct users/24h windows rather than raw event counts, specifically
  so they resist trivial gaming.
- **A React internals bug only real-device testing surfaced** — the share-
  as-image selection UI initially relied on the browser's native text
  highlight staying visible after picking a quote. On mobile it didn't:
  React's own selection-preservation logic (it saves/restores focus-
  adjacent selection state around every commit) clears `window.getSelection()`
  as a side effect of the very state update needed to show the "Share"
  button — invisible on desktop, where a stray click doesn't have the same
  effect, but reliably reproducible on a phone. Root-caused with a
  controlled test (isolating the re-render from the DOM change it triggers)
  rather than guessed at; fixed by snapshotting the selection's geometry
  and rendering an independent highlight instead of depending on the
  browser to keep its own around.

## Built with Claude Code

This project was built in collaboration with [Claude Code](https://claude.com/claude-code)
— I made the product and architecture decisions (schema design, RLS policy
shape, which trade-offs to make, what to build next), reviewed every change,
and tested features end-to-end rather than trusting them blind — including
catching real bugs that way, like the account-deletion foreign-key gap
mentioned above. AI handled a large share of the implementation legwork.
I think that combination — directing AI effectively while still catching
what it gets wrong — is itself a real, demonstrable skill in 2026, and I'd
rather be upfront about the workflow than have it be a surprise.

## Getting started

```bash
npm install
npm run dev
```

Requires a Supabase project and several environment variables (Supabase
URL/keys, PostHog, Cloudflare Turnstile, a test account for the Playwright
suite) — see `.env.local` for the full list this project expects; none of
those values are committed to the repo.

```bash
npm run lint       # ESLint
npm run test:e2e   # Playwright integration tests (anti-spam, reordering, saved books, feedback, nav)
npm run gen:types  # Regenerate src/utils/supabase/database.types.ts from the live schema
```

## License

All rights reserved — see [LICENSE](./LICENSE). The code is public for
portfolio/review purposes; that's not a license to reuse it.
