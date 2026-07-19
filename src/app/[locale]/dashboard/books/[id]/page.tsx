import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { updateBook, deleteBook } from "../actions";
import {
  createChapter,
  updateChapter,
  deleteChapter,
  reorderChapter,
} from "./chapters/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { RichTextEditor } from "@/components/rich-text-editor";
import { NewChapterForm } from "@/components/new-chapter-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { SaveChapterButton } from "@/components/save-chapter-button";

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

  return (
    // Widened from Phase 4's max-w-md — a single-column book form fit fine
    // at that width, but the chapter list's title + action buttons per row
    // need the room.
    <div className="mx-auto max-w-3xl space-y-6 py-12">
      <h1 className="text-2xl font-semibold">{book.title}</h1>

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
            <input
              name="genre"
              defaultValue={book.genre}
              className="w-full rounded border p-2"
            />
            <select
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
            <input
              name="cover_image_url"
              defaultValue={book.cover_image_url ?? ""}
              placeholder="Cover image URL"
              className="w-full rounded border p-2"
            />
            <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
              Save
            </button>
          </form>
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

              return (
                <AccordionItem
                  key={chapter.id}
                  value={chapter.id}
                  className="rounded border px-4"
                >
                  {/* AccordionTrigger renders its own <button> — move/delete
                      sit next to it as siblings instead of nesting inside it,
                      since a <button> can't legally contain other buttons. */}
                  <div className="flex items-center gap-2">
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
                      <form action={moveUp}>
                        <button disabled={i === 0}>Move up</button>
                      </form>
                      <form action={moveDown}>
                        <button disabled={i === chapters.length - 1}>
                          Move down
                        </button>
                      </form>
                      <form action={deleteWithIds}>
                        <ConfirmSubmitButton
                          confirmMessage={`Delete "${chapter.title}"? This can't be undone.`}
                          className="text-destructive"
                        >
                          Delete
                        </ConfirmSubmitButton>
                      </form>
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
                      <SaveChapterButton />
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
