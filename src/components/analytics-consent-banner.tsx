"use client";

import { useSyncExternalStore } from "react";
import { Link } from "@/i18n/navigation";
import {
  getStoredConsent,
  setStoredConsent,
  subscribeToConsent,
} from "@/lib/analytics-consent";

// Null on the server snapshot (and the very first client render) means "no
// decision yet" renders nothing until hydration settles — same
// no-mismatch reasoning as ContinueReadingSection's useSyncExternalStore
// usage. Once a real client snapshot resolves, the banner shows only when
// there's genuinely no stored decision.
export function AnalyticsConsentBanner() {
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getStoredConsent,
    () => null,
  );

  if (consent !== null) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background p-4 shadow-lg">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          We&apos;d like to use analytics cookies to understand how Storyloom
          is used. No tracking happens unless you accept — see our{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setStoredConsent("declined")}
            className="rounded border px-3 py-1.5 text-sm"
          >
            Decline
          </button>
          <button
            onClick={() => setStoredConsent("accepted")}
            className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
