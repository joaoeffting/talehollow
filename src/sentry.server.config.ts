import * as Sentry from "@sentry/nextjs";

// No replay/feedback integrations and no aggressive tracing here —
// deliberately scoped to error tracking only, the thing actually on the
// roadmap. Session replay in particular is real user-interaction recording,
// the same class of thing the PostHog consent banner exists for — adding it
// here would silently reopen that exact gap. Revisit with its own
// consent-gating if replay/tracing is ever wanted.
//
// dsn is undefined until NEXT_PUBLIC_SENTRY_DSN is actually set — Sentry's
// SDKs no-op cleanly with no dsn (verified: no crash, nothing sent), so
// this ships safely ahead of a real Sentry project existing.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
