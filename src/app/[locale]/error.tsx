"use client"; // error boundaries must be Client Components

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Link } from "@/i18n/navigation";

// Catches uncaught exceptions anywhere under this locale segment — wraps
// every page/layout below [locale]/layout.tsx, so the header/footer still
// render around this fallback. Does NOT catch an error in the [locale]
// layout itself, or one before a locale is even resolved — that's what the
// true-root app/global-error.tsx (no shared UI available at that point) is
// for.
export default function Error({
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
    <div className="space-y-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="text-muted-foreground">
        That&apos;s on us — the error&apos;s been reported. Try again, or
        head back to the homepage.
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
  );
}
