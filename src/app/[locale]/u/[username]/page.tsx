import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { BookListItem } from "@/components/book-list-item";
import { EditableProfileHeader } from "@/components/editable-profile-header";
import { updateProfile } from "./actions";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const { data: claims } = await supabase.auth.getClaims();
  const isOwner = claims?.claims?.sub === profile.id;
  const updateWithUsername = updateProfile.bind(null, username, locale);

  // Only that author's published books — a visitor should never see a
  // stranger's drafts just by discovering their profile.
  const { data: books } = await supabase
    .from("books")
    .select("id, title, genre, cover_image_url")
    .eq("author_id", profile.id)
    .eq("is_published", true)
    .order("last_pushed_at", { ascending: false });

  return (
    <div className="space-y-8 py-12">
      <EditableProfileHeader
        profile={profile}
        isOwner={isOwner}
        onSave={updateWithUsername}
      />

      <section>
        <h2 className="mb-2 text-xl font-semibold">Books</h2>
        <ul className="divide-y rounded border">
          {books?.map((book) => (
            <BookListItem
              key={book.id}
              href={`/books/${book.id}`}
              coverImageUrl={book.cover_image_url}
              title={book.title}
              meta={book.genre}
            />
          ))}
          {books?.length === 0 && (
            <li className="p-4 text-sm text-muted-foreground">
              No published books yet.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
