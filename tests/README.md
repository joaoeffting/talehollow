# Anti-spam Playwright tests

Covers phase 17: repeated views, like-spam, comment-flooding, and rapid
publish/feed-push all stay capped at 1-per-user (or don't repeatedly push the
feed), not just that the code compiles.

## One-time setup

1. Create a real storyloom account through the app UI and confirm its email
   (hosted Supabase auth requires this — there's no local inbox to automate
   against). This account will own every book/chapter the tests seed.
2. Add to `.env.local`:
   ```
   TEST_USER_EMAIL=your-test-account@example.com
   TEST_USER_PASSWORD=...
   ```

## Running

```bash
npm run test:e2e
```

`tests/global-setup.ts` logs in as that account, creates and publishes a
fresh book + chapter through the real dashboard UI (not a DB seed script —
none exists in this repo), and hands the resulting IDs to the spec file via
`tests/.auth/fixtures.json` (gitignored, regenerated every run).

## Why there's no direct-DB test

No `SUPABASE_SERVICE_ROLE_KEY` exists in this project's `.env.local`, so the
feed-push test can't read `books.last_pushed_at` directly the way the phase
doc's version does. It instead asserts on an equivalent UI-observable signal:
the homepage feed orders by `last_pushed_at desc`, so a second, near-immediate
publish of the seeded chapter must not be able to jump it back above a second
book that was genuinely published more recently. If you add the service key
later, that test can be simplified back to a direct timestamp comparison.

## Proving the tests aren't tautological (phase doc section 6)

`record_chapter_publish`'s SQL only exists on the linked Supabase project —
there's no local migration file for it in this repo. To verify the feed-push
test can actually fail:

1. Open the Supabase SQL editor for this (dev) project and find
   `record_chapter_publish`.
2. Temporarily comment out its 24h guard so every publish pushes the feed.
3. Re-run `npm run test:e2e` — the feed-push test should now fail.
4. Restore the guard and re-run — it should pass again.

This is a manual step by design: it edits a function on the linked project
directly, which should be a deliberate action, not something a test run does
automatically.
