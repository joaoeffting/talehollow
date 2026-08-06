import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { updateBook, deleteBook, removeCover } from "../actions";
import {
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapter,
} from "./chapters/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CoverInput } from "@/components/cover-input";
import { RichTextEditor } from "@/components/rich-text-editor";
import { NewChapterForm } from "@/components/new-chapter-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { SaveWithLoading } from "@/components/save-with-loading";
import { GenreSelect } from "@/components/genre-select";
import { toggleBookPublished, publishBookAndChapters } from "../actions";
import { Link } from "@/i18n/navigation";
import { toggleChapterPublished } from "./chapters/actions";
import { ChapterActionsMenu } from "@/components/chapter-actions-menu";
import { withSlug } from "@/lib/slug";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("books")
    .select("*")
    .eq("id", id)
    .single();
  if (!book) notFound();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("*")
    .eq("book_id", book.id)
    .order("position");

  const updateWithId = updateBook.bind(null, book.id, locale);
  const deleteWithId = deleteBook.bind(null, book.id, locale);
  const removeCoverWithId = removeCover.bind(null, book.id, locale);

  return (
    // Widened from Phase 4's max-w-md — a single-column book form fit fine
    // at that width, but the chapter list's title + action buttons per row
    // need the room.
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <h1 className="text-2xl font-semibold">{book.title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <form
          action={toggleBookPublished.bind(
            null,
            book.id,
            locale,
            book.is_published,
          )}
        >
          <button
            className={
              book.is_published
                ? "rounded border border-amber-600 px-3 py-1 text-sm text-amber-700"
                : "rounded border border-primary px-3 py-1 text-sm text-primary"
            }
          >
            {book.is_published ? "Unpublish" : "Publish"}
          </button>
        </form>
        <form action={publishBookAndChapters.bind(null, book.id, locale)}>
          <button className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground">
            Publish book + all chapters
          </button>
        </form>
        {book.is_published && (
          <Link
            href={`/books/${withSlug(book.id, book.title)}`}
            className="text-sm underline"
          >
            View live →
          </Link>
        )}
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Story Details</TabsTrigger>
          <TabsTrigger value="toc">Table of Contents</TabsTrigger>
        </TabsList>

        {/* Unchanged from Phase 4, just moved inside a tab. */}
        <TabsContent value="details" className="space-y-6">
          <form action={updateWithId} className="space-y-4">
            <input
              name="title"
              defaultValue={book.title}
              className="w-full rounded border p-2"
            />
            <GenreSelect
              key={book.genre} // force re-render when genre changes, so the select updates
              required
              className="w-full rounded border p-2"
              defaultValue={book.genre}
            />
            <select
              key={book.language} // force re-render when language changes, so the select updates
              name="language"
              defaultValue={book.language}
              className="w-full rounded border p-2"
            >
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
            <textarea
              name="synopsis"
              defaultValue={book.synopsis ?? ""}
              className="w-full rounded border p-2"
            />
            <CoverInput initialUrl={book?.cover_image_url || undefined} />
            <SaveWithLoading label="Save book" />
          </form>
          {book.cover_image_url && (
            <form action={removeCoverWithId}>
              <ConfirmSubmitButton
                confirmMessage={`Remove the cover for "${book.title}"? This can't be undone.`}
                className="text-sm text-destructive underline"
              >
                Remove Cover
              </ConfirmSubmitButton>
            </form>
          )}
          <form action={deleteWithId}>
            <ConfirmSubmitButton
              confirmMessage={`Delete "${book.title}"? This deletes every chapter in it too — this can't be undone.`}
              className="rounded border border-destructive px-4 py-2 text-destructive"
            >
              Delete book
            </ConfirmSubmitButton>
          </form>
        </TabsContent>

        <TabsContent value="toc" className="space-y-4">
          <NewChapterForm action={createChapter.bind(null, book.id, locale)} />

          <Accordion className="space-y-2">
            {chapters?.map((chapter, i) => {
              // Same .bind() pattern as Phase 4 — bakes every id (and locale)
              // into each action so every chapter's buttons call it with the
              // right target.
              const updateWithIds = updateChapter.bind(
                null,
                chapter.id,
                book.id,
                locale,
              );
              const deleteWithIds = deleteChapter.bind(
                null,
                chapter.id,
                book.id,
                locale,
              );
              const moveUp = reorderChapter.bind(
                null,
                chapter.id,
                book.id,
                locale,
                "up",
              );
              const moveDown = reorderChapter.bind(
                null,
                chapter.id,
                book.id,
                locale,
                "down",
              );

              const toggleWithIds = toggleChapterPublished.bind(
                null,
                chapter.id,
                book.id,
                locale,
                chapter.is_published,
              );

              return (
                <AccordionItem
                  key={chapter.id}
                  value={chapter.id}
                  className="rounded border px-4 space-between"
                >
                  <div className="flex justify-between items-center">
                    <AccordionTrigger className="flex-1 hover:no-underline">
                      <span className="flex items-baseline gap-2 text-left">
                        <span className="text-sm text-muted-foreground">
                          #{chapter.position}
                        </span>
                        <span className="font-medium">{chapter.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {chapter.is_published ? "Published" : "Draft"}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <div className="flex shrink-0 gap-2 text-sm">
                      <ChapterActionsMenu
                        chapterTitle={chapter.title}
                        isPublished={chapter.is_published}
                        viewLiveHref={
                          chapter.is_published && book.is_published
                            ? `/books/${book.id}/chapters/${chapter.id}`
                            : null
                        }
                        onTogglePublished={toggleWithIds}
                        onDelete={deleteWithIds}
                        onMoveUp={moveUp}
                        onMoveDown={moveDown}
                        chapterIndex={i}
                        chapterCount={chapters.length}
                      />
                    </div>
                  </div>
                  <AccordionContent className="space-y-2 pt-2">
                    <form action={updateWithIds} className="space-y-2">
                      <input
                        name="title"
                        defaultValue={chapter.title}
                        className="w-full rounded border p-2"
                      />
                      <RichTextEditor
                        name="content"
                        defaultValue={chapter.content ?? ""}
                      />
                      <SaveWithLoading />
                    </form>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
          {chapters?.length === 0 && (
            <p className="rounded border p-4 text-sm text-muted-foreground">
              No chapters yet — add the first one above.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
