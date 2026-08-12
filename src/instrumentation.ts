import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors from Server Components, Route Handlers, and Server
// Actions — the server-side half of "error tracking." The client half is
// instrumentation-client.ts + the error.tsx/global-error.tsx boundaries'
// own Sentry.captureException calls.
export const onRequestError = Sentry.captureRequestError;
