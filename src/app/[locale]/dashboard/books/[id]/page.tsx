import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { updateBook, deleteBook, removeCover } from "../actions";
import { createChapter } from "./chapters/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CoverInput } from "@/components/cover-input";
import { NewChapterForm } from "@/components/new-chapter-form";
import { ChapterList } from "@/components/chapter-list";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SaveWithLoading } from "@/components/save-with-loading";
import { GenreSelect } from "@/components/genre-select";
import { toggleBookPublished, publishBookAndChapters } from "../actions";
import { Link } from "@/i18n/navigation";
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
          <SaveWithLoading
            label={book.is_published ? "Unpublish" : "Publish"}
            pendingLabel={book.is_published ? "Unpublishing…" : "Publishing…"}
            savedLabel={null}
            className={
              book.is_published
                ? "rounded border border-amber-600 px-3 py-1 text-sm text-amber-700 disabled:opacity-60"
                : "rounded border border-primary px-3 py-1 text-sm text-primary disabled:opacity-60"
            }
          />
        </form>
        <form action={publishBookAndChapters.bind(null, book.id, locale)}>
          <SaveWithLoading
            label="Publish book + all chapters"
            pendingLabel="Publishing…"
            savedLabel={null}
          />
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
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="is_mature"
                  defaultChecked={book.is_mature}
                />
                Contains mature content (violence, sexual content, or other
                content not suitable for all audiences)
              </label>
              <textarea
                name="content_warning"
                defaultValue={book.content_warning ?? ""}
                placeholder="Optional: specific content warnings (e.g. graphic violence, self-harm)"
                className="w-full rounded border p-2 text-sm"
              />
            </div>
            <CoverInput initialUrl={book?.cover_image_url || undefined} />
            <SaveWithLoading label="Save book" />
          </form>
          {book.cover_image_url && (
            <form action={removeCoverWithId}>
              <ConfirmSubmitButton
                confirmMessage={`Remove the cover for "${book.title}"? This can't be undone.`}
                pendingLabel="Removing…"
                className="text-sm text-destructive underline"
              >
                Remove Cover
              </ConfirmSubmitButton>
            </form>
          )}
          <form action={deleteWithId}>
            <ConfirmSubmitButton
              confirmMessage={`Delete "${book.title}"? This deletes every chapter in it too — this can't be undone.`}
              pendingLabel="Deleting…"
              className="rounded border border-destructive px-4 py-2 text-destructive"
            >
              Delete book
            </ConfirmSubmitButton>
          </form>
        </TabsContent>

        <TabsContent value="toc" className="space-y-4">
          <NewChapterForm
            bookId={book.id}
            action={createChapter.bind(null, book.id, locale)}
          />

          {chapters && chapters.length > 0 && (
            <ChapterList
              chapters={chapters}
              bookId={book.id}
              bookIsPublished={book.is_published}
              locale={locale}
            />
          )}
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
