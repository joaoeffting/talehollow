import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { GENRES } from "@/components/genre-select";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; language: string }>;
}): Promise<Metadata> {
  const { locale, language } = await params;
  return {
    title: `Rankings (${language.toUpperCase()}) — Storyloom`,
    description: `Browse top-ranked ${language.toUpperCase()} stories by genre on Storyloom.`,
    alternates: { canonical: `/${locale}/rankings/${language}` },
  };
}

export default async function RankingsIndexPage({
  params,
}: {
  params: Promise<{ locale: string; language: string }>;
}) {
  const { language } = await params;

  return (
    <div className="space-y-6 py-12">
      <h1 className="text-3xl font-bold">
        Rankings ({language.toUpperCase()})
      </h1>
      <p className="text-muted-foreground">
        Pick a genre to see its top-ranked stories.
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {GENRES.map((genre) => (
          <li key={genre.value}>
            <Link
              href={`/rankings/${language}/${genre.value}`}
              className="block rounded border p-4 text-center font-medium text-primary underline underline-offset-4 hover:text-accent"
            >
              {genre.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
