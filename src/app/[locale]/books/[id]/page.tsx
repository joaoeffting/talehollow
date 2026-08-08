import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { Eye, ThumbsUp, MessageCircle, Pencil } from "lucide-react";
import { ReportButton } from "@/components/report-button";
import { SaveButton } from "@/components/save-button";
import { ChapterListWithProgress } from "@/components/chapter-list-with-progress";
import { withSlug } from "@/lib/slug";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("books")
    .select("title, synopsis, cover_image_url")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!book) return {}; // let the page's own notFound() handle the 404 case

  return {
    title: `${book.title} — Storyloom`,
    description: book.synopsis ?? undefined,
    alternates: {
      // The slug-rewrite in next.config.ts means this book is also reachable
      // at the bare-id URL — canonical points search engines at the pretty,
      // slugged one that every internal link (withSlug) actually uses.
      canonical: `/${locale}/books/${withSlug(id, book.title)}`,
    },
    openGraph: {
      title: book.title,
      description: book.synopsis ?? undefined,
      images: book.cover_image_url ? [book.cover_image_url] : undefined,
    },
  };
}

export default async function PublicBookPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  // Two conditions in the query, not one: RLS already hides unpublished
  // books from other users, but the explicit .eq('is_published', true) here
  // also stops the *author themselves* from landing on their own draft's
  // "public" URL and seeing it rendered as if it were live.
  const { data: book } = await supabase
    .from("books")
    // Explicit FK name, not just "profiles(...)" — the new saved_books
    // table also links books to profiles, so an unqualified embed is
    // ambiguous now (PGRST201) between "the author" and "who saved this."
    .select("*, profiles!books_author_id_fkey(username, display_name)")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (!book) notFound();

  const isAuthor = claims?.claims?.sub === book.author_id;

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, position")
    .eq("book_id", id)
    .eq("is_published", true)
    .order("position");

  const { data: viewRows } = await supabase
    .from("views")
    .select("view_count")
    .eq("book_id", id);

  const viewCount = viewRows?.reduce((sum, v) => sum + v.view_count, 0) ?? 0;

  const { data: chapterViews } = await supabase
    .from("chapters")
    .select("anon_view_count")
    .eq("book_id", id)
    .eq("is_published", true);

  const { count: likeCount } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("book_id", id);

  const totalAnonViews =
    chapterViews?.reduce((sum, c) => sum + c.anon_view_count, 0) ?? 0;
  const totalViews = viewCount + totalAnonViews;

  const { count: commentCount } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("book_id", id);

  let isSaved = false;
  if (claims?.claims) {
    const { data: existingSave } = await supabase
      .from("saved_books")
      .select("book_id")
      .eq("book_id", id)
      .eq("user_id", claims.claims.sub)
      .maybeSingle();
    isSaved = !!existingSave;
  }

  return (
    <div className="space-y-6 py-12">
      <script
        type="application/ld+json"
        // Structured data search engines can parse to understand this page is
        // specifically a "Book" (with an author, genre, etc.), not just a
        // blob of text — can surface richer results than a plain title/description.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Book",
            name: book.title,
            author: { "@type": "Person", name: book.profiles.display_name },
            genre: book.genre,
            inLanguage: book.language,
            description: book.synopsis,
          }),
        }}
      />
      <div>
        <h1 className="text-3xl font-bold">{book.title}</h1>
        {book.cover_image_url && (
          // Fixed 2:3 aspect ratio, matching the convention already used by
          // BookCoverThumbnail and CoverInput's preview elsewhere in the app.
          <div className="relative aspect-2/3 w-full max-w-xs">
            <Image
              src={book.cover_image_url}
              alt={book.title}
              fill
              className="rounded object-cover"
              sizes="(max-width: 640px) 100vw, 320px"
            />
          </div>
        )}
        <p className="text-muted-foreground">
          by{" "}
          <Link
            href={`/u/${book.profiles.username}`}
            className="text-primary underline underline-offset-4 hover:text-accent"
          >
            {book.profiles.display_name}
          </Link>{" "}
          · {book.genre}
        </p>
        <p className="mt-4">{book.synopsis}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Eye className="h-4 w-4" aria-hidden="true" />
          {/* "1 views" reads as a typo, not a feature — worth the ternary. */}
          {totalViews} {totalViews === 1 ? "view" : "views"}
        </span>
        <span className="flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          {likeCount ?? 0} {likeCount === 1 ? "like" : "likes"}
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          {commentCount ?? 0} {commentCount === 1 ? "comment" : "comments"}
        </span>
        {isAuthor && (
          <Link
            href={`/dashboard/books/${book.id}`}
            className="flex items-center gap-1.5 text-primary underline underline-offset-4 hover:text-accent"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
        )}
        {claims?.claims && (
          <>
            <SaveButton bookId={book.id} initialIsSaved={isSaved} />
            <ReportButton targetType="book" targetId={book.id} locale={locale} />
          </>
        )}
      </div>
      <ChapterListWithProgress
        bookId={id}
        bookTitle={book.title}
        chapters={chapters ?? []}
      />
    </div>
  );
}
