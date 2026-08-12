import * as Sentry from "@sentry/nextjs";

// Covers src/proxy.ts, which runs on the edge runtime by default — same
// scope/reasoning as sentry.server.config.ts (error tracking only, no
// replay/tracing).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});
