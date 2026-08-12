import * as Sentry from "@sentry/nextjs";

// Same scope as sentry.server.config.ts — error tracking only, no replay,
// no feedback widget, no tracing. See that file's comment for why replay
// specifically is deliberately left out.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
