import { createBook } from "../actions";
import { GenreSelect } from "@/components/genre-select";

export default async function NewBookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <form
      action={createBook.bind(null, locale)}
      className="mx-auto max-w-md space-y-4 py-12"
    >
      <h1 className="text-2xl font-semibold">New book</h1>
      <input
        name="title"
        required
        placeholder="Title"
        className="w-full rounded border p-2"
      />
      <GenreSelect required className="w-full rounded border p-2" />
      <select
        name="language"
        defaultValue="en"
        className="w-full rounded border p-2"
      >
        <option value="en">English</option>
        <option value="pt">Português</option>
      </select>
      <textarea
        name="synopsis"
        placeholder="Synopsis"
        className="w-full rounded border p-2"
      />
      <button className="rounded bg-primary px-4 py-2 text-primary-foreground">
        Create draft
      </button>
    </form>
  );
}
