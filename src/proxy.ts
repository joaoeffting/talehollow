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
  return updateSession(request, response);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
