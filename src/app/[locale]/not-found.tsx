import { Link } from "@/i18n/navigation";

// Composes inside [locale]/layout.tsx (header/footer still render) since
// this lives within the locale segment, not the true app root — covers
// both an explicit notFound() call (a book/chapter/profile that doesn't
// exist) and any URL under a valid locale that doesn't match a route.
export default function NotFound() {
  return (
    <div className="space-y-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">
        Whatever you were looking for isn&apos;t here — it may have been
        removed, or the link might be wrong.
      </p>
      <Link
        href="/"
        className="inline-block text-primary underline underline-offset-4 hover:text-accent"
      >
        ← Back to Talehollow
      </Link>
    </div>
  );
}
