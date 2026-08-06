import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { BookListItem } from "@/components/book-list-item";
import { EditableProfileHeader } from "@/components/editable-profile-header";
import { ScrapbookSection } from "@/components/scrapbook-section";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

  const { data: entries } = await supabase
    .from("scrapbook_entries")
    .select(
      "id, content, author_id, profiles!scrapbook_entries_author_id_fkey(username, display_name)",
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8 py-12">
      <EditableProfileHeader
        profile={profile}
        isOwner={isOwner}
        onSave={updateWithUsername}
      />

      <Tabs defaultValue="books">
        <TabsList>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="scrapbook">Scrapbook</TabsTrigger>
        </TabsList>

        <TabsContent value="books">
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
        </TabsContent>

        <TabsContent value="scrapbook">
          <ScrapbookSection
            profileId={profile.id}
            username={username}
            locale={locale}
            currentUserId={claims?.claims?.sub ?? null}
            entries={entries ?? []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
