import type { Metadata } from "next";
import { Search } from "lucide-react";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Providers } from "../providers";
import { PostHogPageview } from "@/components/posthog-pageview";
import { AnalyticsConsentBanner } from "@/components/analytics-consent-banner";
import { CookiePreferencesLink } from "@/components/cookie-preferences-link";
import { NavAuthLinks } from "@/components/nav-auth-links";
import { BottomNav } from "@/components/bottom-nav";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

export const metadata: Metadata = {
  // Lets every per-page metadata export below use relative image/canonical
  // URLs (e.g. openGraph.images: ["/covers/x.jpg"]) and have them resolve to
  // absolute ones in the actual rendered <meta>/<link> tags.
  metadataBase: new URL(SITE_URL),
  title: "Storyloom",
  description: "A community platform for serialized fiction.",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Guards against an unconfigured locale slipping through as a route param
  // (e.g. someone hand-typing /fr/...) — next-intl's middleware normally
  // prevents this at the proxy layer, but a Server Component can still be
  // reached directly.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Makes messages/{locale}.json available to Client Components via
            useTranslations() further down the tree. Server Components use
            getTranslations() directly and don't need this provider. */}
        <NextIntlClientProvider>
          <Providers>
            <PostHogPageview />
            <header className="border-b">
              <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
                <div className="flex items-center gap-6">
                  <Link href="/" className="text-lg font-semibold">
                    Storyloom
                  </Link>
                  {/* Defaults to the current UI locale as the ranking language segment —
        same fallback the homepage feed (Phase 7) uses for a visitor with no
        explicit content-language preference. There's no cross-language
        switcher inside rankings yet, so this is the only entry point. */}
                  <Link
                    href={`/rankings/${locale}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Rankings
                  </Link>
                  <Link
                    href="/search"
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    Search
                  </Link>
                </div>
                <NavAuthLinks locale={locale} />
              </div>
            </header>
            {/* pb-20 clears BottomNavBar's fixed height at every screen
                size — it's shown always, not just on mobile. */}
            <main className="mx-auto max-w-5xl p-4 pb-20">{children}</main>
            <footer className="border-t pb-20">
              <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 p-4 text-sm text-muted-foreground">
                <p>© {new Date().getFullYear()} Storyloom</p>
                <div className="flex gap-4">
                  <Link href="/terms" className="hover:text-foreground">
                    Terms
                  </Link>
                  <Link href="/privacy" className="hover:text-foreground">
                    Privacy
                  </Link>
                  <CookiePreferencesLink />
                </div>
              </div>
            </footer>
            <AnalyticsConsentBanner />
            <BottomNav />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
