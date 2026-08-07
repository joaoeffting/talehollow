// Single source of truth for the app's public base URL — everything that
// needs an absolute URL (metadataBase, canonical tags, sitemap.xml,
// robots.txt, JSON-LD) reads from here instead of hardcoding a domain, so
// swapping in the real domain later is a one-line env var change.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
