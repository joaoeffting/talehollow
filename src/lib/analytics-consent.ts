// Whether this visitor has opted into analytics — purely a browser
// preference (like reading progress in last-read.ts), not tied to an
// account, since anonymous visitors need to be asked too. No decision
// stored yet means "haven't asked" (show the banner, don't track) — this is
// deliberately NOT "declined by default" vs. "accepted by default," it's a
// genuine third state.
const STORAGE_KEY = "talehollow:analytics-consent";
const CHANGE_EVENT = "talehollow:analytics-consent-change";

export type ConsentValue = "accepted" | "declined";

export function getStoredConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "accepted" || raw === "declined" ? raw : null;
}

export function setStoredConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // localStorage can throw (private browsing, quota) — worst case the
    // banner just reappears next visit, not worth crashing over.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Lets someone change their mind later (the footer's "Cookie preferences"
// link) — clearing the decision brings the banner back so they can pick
// either way again, covering both "opt in later" and "opt out later" with
// one mechanism.
export function clearStoredConsent() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See setStoredConsent above.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Native "storage" only fires in other tabs, never the one that made the
// change — same reasoning/pattern as last-read.ts's subscribeToLastRead,
// hence also dispatching + listening for the custom event above.
export function subscribeToConsent(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
