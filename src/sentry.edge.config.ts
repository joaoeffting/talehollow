import * as Sentry from "@sentry/nextjs";

// Covers src/proxy.ts, which runs on the edge runtime by default — same
// scope/reasoning as sentry.server.config.ts (error tracking only, no
// replay/tracing).
// environment: one Sentry project, not two — see instrumentation-client.ts's
// comment on the same option for the full reasoning.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
});
