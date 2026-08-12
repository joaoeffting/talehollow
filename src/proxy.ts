import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/utils/supabase/proxy";

// next-intl's middleware factory: handles locale detection, the
// default-locale redirect (e.g. `/` -> `/en`), and rewrites the request so
// the rest of the app can treat [locale] as just another route segment.
const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  // Nonce-based, not 'unsafe-inline', on script-src — chosen deliberately
  // after this project's own stored-XSS incident (unsanitized chapter HTML,
  // see sanitize-chapter-html.ts): 'unsafe-inline' would let that exact bug
  // class execute again even with a CSP shipped, which defeats the point.
  // style-src stays on 'unsafe-inline' though — shadcn/ui's Radix-based
  // components (dialog, dropdown-menu, accordion) set positioning via
  // inline `style="..."` attributes at runtime, which CSP nonces can only
  // ever cover for <style> elements/tags, never for style="" attributes or
  // element.style.x assignments. This doesn't reopen the chapter-content
  // vulnerability: sanitizeChapterHtml() strips every attribute, style
  // included, so stored content can never carry an inline style at all.
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data: https://*.supabase.co;
    font-src 'self';
    connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.i.posthog.com https://*.sentry.io https://challenges.cloudflare.com;
    frame-src https://challenges.cloudflare.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // Set in place (not cloned into a fresh Headers passed via a rebuilt
  // NextRequest) specifically so next-intl's own middleware — which reads
  // `request.headers` internally to build its own NextResponse.next()/
  // rewrite() calls (see next-intl's middleware.js: `new
  // Headers(request.headers)`) — picks the nonce up and forwards it
  // upstream for us. Rebuilding the whole NextRequest instead would risk
  // touching this app's POST Server Action bodies (cover-image uploads
  // included), which this route also proxies.
  request.headers.set("x-nonce", nonce);

  // Run next-intl first so its locale-aware response exists, THEN layer the
  // Supabase session refresh onto that same response rather than building a
  // second, unrelated one that would clobber the locale rewrite.
  const response = handleI18nRouting(request);

  response.headers.set("Content-Security-Policy", cspHeader);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  // Defense-in-depth alongside CSP's frame-ancestors 'none' above, for
  // older browsers that don't understand frame-ancestors.
  response.headers.set("X-Frame-Options", "DENY");
  if (!isDev) {
    // Only in production — sending this from a dev server would pin the
    // browser into HTTPS-only for the dev host too.
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

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
    // sitemap.xml/robots.txt (src/app/sitemap.ts, robots.ts) and auth/confirm
    // (src/app/auth/confirm/route.ts) all live at the app root, outside
    // [locale] — without excluding them here, next-intl's locale redirect
    // would send them to e.g. /en/auth/confirm, which 404s (no [locale]
    // route exists there) instead of reaching the actual root-level handler.
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
