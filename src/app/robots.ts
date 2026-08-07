import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Auto-served at /robots.txt.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Leading wildcards account for the locale prefix (/en/dashboard,
      // /pt/dashboard, ...) — there's nothing for a search engine to
      // usefully index behind a login wall in any locale anyway.
      disallow: ["/*/dashboard", "/*/admin", "/*/account", "/*/settings"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
