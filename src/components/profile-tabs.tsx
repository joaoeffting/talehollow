"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

const TAB_VALUES = ["books", "scrapbook", "saved"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function readTabFromParams(searchParams: URLSearchParams, isOwner: boolean): TabValue {
  const raw = searchParams.get("tab");
  const requested = TAB_VALUES.includes(raw as TabValue) ? (raw as TabValue) : "books";
  return requested === "saved" && !isOwner ? "books" : requested;
}

// Controlled wrapper around the plain Tabs primitive, synced to the ?tab=
// URL param — the previous defaultValue-only version left the URL frozen
// at whatever tab it was first loaded with, so switching tabs via the UI
// silently went stale (the bottom nav's Saved link kept pointing at a
// ?tab=saved URL that no longer matched what was on screen), and clicking
// it a second time from an already-on-this-page state was a no-op since
// the URL genuinely hadn't changed.
//
// The visible tab is driven by local state, not searchParams directly —
// deriving it straight from useSearchParams() meant a fast second click
// (e.g. tapping a different tab right after landing here via the bottom
// nav's Saved link) could race an in-flight URL update from the previous
// change and get silently dropped, leaving the wrong tab showing. Local
// state updates instantly on click, with the URL kept in sync as a
// best-effort side effect for shareable links/back-nav — and a real
// navigation from outside (the bottom nav Link) still lands through the
// render-time sync below, so tapping Saved a second time works too.
//
// The URL sync itself uses history.replaceState directly, not next-intl's
// router.replace() — two replace() calls issued close together (e.g. this
// component's own update racing the bottom nav Link's navigation that just
// landed here) were observed to have the second one silently dropped by
// Next's router, leaving a stale ?tab= in the address bar. Since nothing
// here needs Next to re-render (every tab's content is already present,
// passed in as children), a plain synchronous history write sidesteps that
// entirely — it just doesn't feed back into useSearchParams(), which is
// fine, since this component doesn't read the URL as its source of truth
// for its own clicks anyway (only for navigations originating elsewhere).
export function ProfileTabs({
  isOwner,
  children,
}: {
  isOwner: boolean;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const tabFromUrl = readTabFromParams(searchParams, isOwner);

  const [tab, setTab] = useState<TabValue>(tabFromUrl);
  // Tracks the last URL-derived value state was synced to, so the render-time
  // adjustment below only fires on a genuine external change (not an effect
  // — tabFromUrl is identical between SSR and hydration, so there's no
  // mismatch risk to defer past mount for here) — picks up navigations that
  // didn't originate from this component's own onValueChange below: the
  // bottom nav's Saved link, a shared ?tab= URL, browser back/forward.
  const [syncedTabFromUrl, setSyncedTabFromUrl] = useState(tabFromUrl);
  if (tabFromUrl !== syncedTabFromUrl) {
    setSyncedTabFromUrl(tabFromUrl);
    setTab(tabFromUrl);
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const nextTab = value as TabValue;
        setTab(nextTab);

        const params = new URLSearchParams(searchParams.toString());
        if (nextTab === "books") {
          params.delete("tab");
        } else {
          params.set("tab", nextTab);
        }
        const query = params.toString();
        const newHref = `${window.location.pathname}${query ? `?${query}` : ""}`;
        window.history.replaceState(null, "", newHref);
      }}
    >
      {children}
    </Tabs>
  );
}
