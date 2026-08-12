"use client";

// Deliberately next/navigation's usePathname here, NOT the locale-aware one
// from @/i18n/navigation — next-intl's version strips the locale prefix for
// convenience when building links, but for analytics we want the raw path
// (including /en or /pt) so PostHog can tell the locales apart.
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    // Providers only calls posthog.init() once consent is accepted — this
    // guards the same condition here rather than assuming it, since a
    // route change can fire before that effect has run (or when consent
    // was never given at all).
    if (!posthog.__loaded) return;

    let url = window.origin + pathname;
    if (searchParams.toString()) url += `?${searchParams.toString()}`;

    // posthog-js's built-in capture_pageview only fires on a real full page
    // load — App Router client-side navigations don't trigger one, so
    // without this manual capture(), every route after the first would go
    // untracked.
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}
