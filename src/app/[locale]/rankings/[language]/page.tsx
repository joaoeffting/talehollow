import type { Metadata } from "next";
import {
  Heart,
  Rocket,
  Search,
  Zap,
  Ghost,
  Landmark,
  BookOpen,
  GraduationCap,
  PenTool,
  Compass,
  Drama,
  Smile,
  Feather,
  Newspaper,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { GENRES } from "@/components/genre-select";

// One icon + tint per genre — a stand-in for real per-genre artwork, cycling
// through the theme's three brand colors (primary/accent/destructive) so it
// stays on-brand in both light and dark mode without hardcoded hex values.
const GENRE_ICONS: Record<string, LucideIcon> = {
  fantasy: Sparkles,
  "science-fiction": Rocket,
  romance: Heart,
  mystery: Search,
  thriller: Zap,
  horror: Ghost,
  "historical-fiction": Landmark,
  "literary-fiction": BookOpen,
  "young-adult": GraduationCap,
  fanfiction: PenTool,
  adventure: Compass,
  drama: Drama,
  comedy: Smile,
  poetry: Feather,
  "non-fiction": Newspaper,
};

const TINTS = [
  "bg-primary/10 text-primary",
  "bg-accent/15 text-accent-foreground",
  "bg-destructive/10 text-destructive",
];

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
      <ul className="grid grid-cols-2 gap-3">
        {GENRES.map((genre, i) => {
          const Icon = GENRE_ICONS[genre.value] ?? BookOpen;
          return (
            <li key={genre.value}>
              <Link
                href={`/rankings/${language}/${genre.value}`}
                className={`flex items-center justify-between gap-3 rounded-xl border p-4 font-semibold transition-colors hover:border-primary ${TINTS[i % TINTS.length]}`}
              >
                {genre.label}
                <Icon className="h-8 w-8 shrink-0 opacity-70" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
