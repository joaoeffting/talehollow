"use client";

import { clearStoredConsent } from "@/lib/analytics-consent";

// Clearing the stored decision brings the consent banner back — the same
// mechanism covers both "I want to opt in now" and "I want to opt out now,"
// since either way it just re-asks.
export function CookiePreferencesLink() {
  return (
    <button
      onClick={() => clearStoredConsent()}
      className="hover:text-foreground"
    >
      Cookie preferences
    </button>
  );
}
