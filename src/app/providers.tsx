"use client";

import { useEffect, useSyncExternalStore } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import {
  getStoredConsent,
  subscribeToConsent,
} from "@/lib/analytics-consent";

// posthog.init() is what actually starts loading PostHog's script and
// sending data — gating it behind this (rather than initializing
// unconditionally like before) is what makes the consent banner meaningful.
// Passing the uninitialized `posthog` singleton to PostHogProvider below is
// harmless either way — it's just a context reference, no network activity
// happens until init() is actually called.
function initPostHogIfConsented() {
  if (posthog.__loaded) return;
  if (getStoredConsent() !== "accepted") return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: "identified_only",
    capture_pageview: false, // captured manually — see posthog-pageview.tsx
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  // useSyncExternalStore just reads the current value (getSnapshot must
  // stay pure — no side effects in there); the actual init() call lives in
  // the effect below, which re-runs on every consent change (the banner's
  // Accept button, or the footer's "Cookie preferences" link), not just
  // once on mount — a returning visitor who already accepted gets tracked
  // immediately, and someone accepting mid-session starts right then too.
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getStoredConsent,
    () => null,
  );

  useEffect(() => {
    initPostHogIfConsented();
  }, [consent]);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
