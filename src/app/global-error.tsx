"use client"; // error boundaries must be Client Components

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import "./globals.css";

// Only fires if the root [locale]/layout.tsx itself throws — a genuinely
// rare, catastrophic case, not the everyday "a page failed" one (that's
// [locale]/error.tsx). Must define its own <html>/<body> and bring its own
// styles: it replaces the entire app, so nothing from [locale]/layout.tsx
// (header, footer, NextIntlClientProvider) is available here. next/link's
// own Link, not the locale-aware one from @/i18n/navigation, since that
// one depends on next-intl's routing context, which isn't guaranteed to be
// mounted at this point. metadata/generateMetadata aren't supported in this
// file (Client Component requirement), hence the plain <title> tag instead.
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something went wrong — Talehollow</title>
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="mx-auto max-w-5xl space-y-4 py-24 text-center">
          <h1 className="text-3xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            That&apos;s on us — the error&apos;s been reported. Try again,
            or head back to the homepage.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => unstable_retry()}
              className="rounded bg-primary px-4 py-2 text-primary-foreground"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Back to Talehollow
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
