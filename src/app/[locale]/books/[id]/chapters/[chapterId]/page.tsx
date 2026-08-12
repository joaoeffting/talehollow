import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/utils/supabase/server";
import { ViewTracker } from "./view-tracker";
import { LastReadTracker } from "./last-read-tracker";
import { LikeButton } from "./like-button";
import { CommentSection } from "./comment-section";
import { ReportButton } from "@/components/report-button";
import { withSlug } from "@/lib/slug";
import { SITE_URL } from "@/lib/site";
import { sanitizeChapterHtml } from "@/lib/sanitize-chapter-html";
import { safeJsonLd } from "@/lib/json-ld";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string; chapterId: string }>;
}): Promise<Metadata> {
  const { locale, id, chapterId } = await params;
  const supabase = await createClient();
  const { data: chapter } = await supabase
    .from("chapters")
    .select("title, content, position, books(title, cover_image_url)")
    .eq("id", chapterId)
    .eq("is_published", true)
    .single();

  if (!chapter) return {};

  // content is Tiptap-authored HTML — strip tags for a plain-text meta
  // description rather than dumping markup into the page's <meta> tag.
  const plainText = (chapter.content ?? "").replace(/<[^>]+>/g, " ").trim();
  const description =
    plainText.length > 160 ? `${plainText.slice(0, 157)}...` : plainText;

  return {
    title: `${chapter.title} — ${chapter.books.title} — Storyloom`,
    description,
    alternates: {
      canonical: `/${locale}/books/${withSlug(id, chapter.books.title)}/chapters/${withSlug(chapterId, chapter.title)}`,
    },
    openGraph: {
      title: `${chapter.title} (Ch. ${chapter.position}) — ${chapter.books.title}`,
      description,
      images: chapter.books.cover_image_url
        ? [chapter.books.cover_image_url]
        : undefined,
    },
  };
}

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; chapterId: string }>;
}) {
  const { id, chapterId, locale } = await params;
  const supabase = await createClient();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  const { data: claims } = await supabase.auth.getClaims();
  if (claims?.claims) {
    await supabase.rpc("record_view", {
      p_chapter_id: chapterId,
      p_book_id: id,
    });
  }

  // Selects a bit more than the slug link below needs (genre/language) so
  // the JSON-LD blocks further down don't need a second book query.
  const { data: book } = await supabase
    .from("books")
    .select("title, genre, language, cover_image_url")
    .eq("id", id)
    .single();
  if (!book) notFound();

  // Fetch the whole published chapter list (not just this one chapter) so
  // we can compute prev/next by array position, rather than issuing two
  // extra queries for "the chapter before/after this position."
  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, content, position")
    .eq("book_id", id)
    .eq("is_published", true)
    .order("position");

  const index = chapters?.findIndex((c) => c.id === chapterId) ?? -1;
  if (index === -1 || !chapters) notFound();

  const { count: chapterLikeCount } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("chapter_id", chapterId);

  // Only worth checking "did I like this" for a signed-in viewer — the
  // toggle action itself is a no-op for logged-out visitors.
  let isLiked = false;
  if (claims?.claims) {
    const { data: existingLike } = await supabase
      .from("likes")
      .select("id")
      .eq("chapter_id", chapterId)
      .eq("user_id", claims.claims.sub)
      .maybeSingle();
    isLiked = !!existingLike;
  }

  const chapter = chapters[index];
  const prev = chapters[index - 1]; // undefined if this is the first chapter
  const next = chapters[index + 1]; // undefined if this is the last chapter

  const { data: comments } = await supabase
    .from("comments")
    .select(
      "id, content, created_at, user_id, profiles(username, display_name, avatar_url)",
    )
    .eq("chapter_id", chapter.id)
    .order("created_at", { ascending: false });

  const bookHref = `/books/${withSlug(id, book.title)}`;

  return (
    <article className="space-y-6 py-6">
      <script
        type="application/ld+json"
        nonce={nonce}
        // Ties this page back to its parent Book, and reflects its place in
        // the table of contents via `position`.
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "Chapter",
            name: chapter.title,
            position: chapter.position,
            isPartOf: { "@type": "Book", name: book.title },
            inLanguage: book.language,
          }),
        }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        // Lets search results show a "Home > Book > Chapter" breadcrumb
        // trail instead of a bare URL.
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Storyloom",
                item: `${SITE_URL}/${locale}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: book.title,
                item: `${SITE_URL}/${locale}${bookHref}`,
              },
              { "@type": "ListItem", position: 3, name: chapter.title },
            ],
          }),
        }}
      />
      {!claims?.claims && <ViewTracker chapterId={chapter.id} />}
      <LastReadTracker
        bookId={id}
        bookTitle={book.title}
        bookCoverUrl={book.cover_image_url}
        chapterId={chapter.id}
        chapterTitle={chapter.title}
        position={chapter.position}
      />
      <Link
        href={bookHref}
        className="text-md text-muted-foreground underline underline-offset-4 hover:text-accent"
      >
        ← Go back to book
      </Link>
      <h1 className="text-2xl font-semibold mt-5">{chapter.title}</h1>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{
          __html: sanitizeChapterHtml(chapter.content ?? ""),
        }}
      />
      <div className="flex items-center gap-4">
        <LikeButton
          chapterId={chapter.id}
          bookId={id}
          locale={locale}
          initialCount={chapterLikeCount ?? 0}
          initialIsLiked={isLiked}
        />
        {claims?.claims && (
          <ReportButton
            targetType="chapter"
            targetId={chapter.id}
            locale={locale}
          />
        )}
      </div>
      <CommentSection
        chapterId={chapter.id}
        bookId={id}
        locale={locale}
        currentUserId={claims?.claims?.sub ?? null}
        comments={comments ?? []}
      />
      <div className="flex justify-between border-t pt-4 text-sm">
        {prev ? (
          <Link
            href={`/books/${withSlug(id, book.title)}/chapters/${withSlug(prev.id, prev.title)}`}
            className="text-primary underline underline-offset-4 hover:text-accent"
          >
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/books/${withSlug(id, book.title)}/chapters/${withSlug(next.id, next.title)}`}
            className="text-primary underline underline-offset-4 hover:text-accent"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </article>
  );
}
