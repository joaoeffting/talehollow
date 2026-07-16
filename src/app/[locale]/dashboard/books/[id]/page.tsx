import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { updateBook, deleteBook } from "../actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { GenreSelect } from "@/components/genre-select";

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

  // If this book doesn't exist, or it's someone else's draft, RLS makes
  // `.select()` return null here rather than throwing — from the app's
  // point of view a "forbidden" row and a genuinely missing row look
  // identical, which is exactly the behavior you want (no confirming to a
  // stranger that a private draft exists at this id).
  if (!book) notFound();

  // .bind(null, ...) partially applies each Server Action with the ids it
  // needs baked in, so the <form action={...}> below doesn't need hidden
  // inputs just to smuggle the book id and locale through to the action.
  const updateWithId = updateBook.bind(null, book.id, locale);
  const deleteWithId = deleteBook.bind(null, book.id, locale);

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <h1 className="text-2xl font-semibold">Edit book</h1>
      <form action={updateWithId} className="space-y-4">
        <input
          name="title"
          defaultValue={book.title}
          className="w-full rounded border p-2"
        />
        <GenreSelect
          key={book.genre}
          defaultValue={book.genre}
          className="w-full rounded border p-2"
        />
        <select
          key={book.language}
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
    </div>
  );
}
