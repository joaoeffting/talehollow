import * as Sentry from "@sentry/nextjs";

// Same scope as sentry.server.config.ts — error tracking only, no replay,
// no feedback widget, no tracing. See that file's comment for why replay
// specifically is deliberately left out.
//
// environment: one Sentry project, not two — `npm run dev` sends events
// tagged "development", a real `next build`/`next start` (including
// Vercel's own Production deployments) tags "production". Filters/alerts
// scope to environment:production instead of fragmenting error tracking
// across separate dev/prod projects.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
