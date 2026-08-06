import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookListItem } from "@/components/book-list-item";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  // Same fallback as the header (NavAuthLinks) — initials from the display
  // name, or the username if there isn't one, so a visitor never sees a
  // broken image when an author hasn't set an avatar.
  const initials = (profile.display_name ?? profile.username ?? "?")
    .slice(0, 2)
    .toUpperCase();

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
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage
            src={profile.avatar_url ?? undefined}
            alt={profile.display_name ?? profile.username}
          />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold">{profile.display_name}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
        </div>
      </div>
      {profile.bio && <p>{profile.bio}</p>}

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
