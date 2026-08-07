import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/utils/supabase/proxy";

// next-intl's middleware factory: handles locale detection, the
// default-locale redirect (e.g. `/` -> `/en`), and rewrites the request so
// the rest of the app can treat [locale] as just another route segment.
const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Run next-intl first so its locale-aware response exists, THEN layer the
  // Supabase session refresh onto that same response rather than building a
  // second, unrelated one that would clobber the locale rewrite.
  const response = handleI18nRouting(request);

  if (!request.cookies.has("anon_id")) {
    // One per browser, kept for a year — this is the dedupe key
    // record_anon_view() uses in place of user_id for logged-out visitors.
    response.cookies.set("anon_id", crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return updateSession(request, response);
}

export const config = {
  matcher: [
    // sitemap.xml/robots.txt (src/app/sitemap.ts, robots.ts) live at the app
    // root, outside [locale] — without excluding them here, next-intl's
    // locale redirect sends crawlers to /en/sitemap.xml, which 404s.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
