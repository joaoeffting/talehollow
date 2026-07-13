import type { Metadata } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Providers } from "../providers";
import { PostHogPageview } from "@/components/posthog-pageview";
import "../globals.css";

export const metadata: Metadata = {
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
                <Link href="/" className="text-lg font-semibold">
                  Storyloom
                </Link>
              </div>
            </header>
            <main className="mx-auto max-w-5xl p-4">{children}</main>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
