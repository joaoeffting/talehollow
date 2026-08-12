import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Pencil } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { Link } from "@/i18n/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BookListItem } from "@/components/book-list-item";
import { EditableProfileHeader } from "@/components/editable-profile-header";
import { FollowButton } from "@/components/follow-button";
import { FollowListDialog } from "@/components/follow-list-dialog";
import { SaveButton } from "@/components/save-button";
import { ScrapbookSection } from "@/components/scrapbook-section";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { withSlug } from "@/lib/slug";
import { getBookRankingsLookup } from "@/lib/book-rankings";
import { getSavedBookIds } from "@/lib/saved-books";
import { genreLabelFor } from "@/components/genre-select";
import { updateProfile } from "./actions";

// Same avatar-plus-name row used for both the Followers and Following
// tabs — kept local and non-exported since profile-list-item shape isn't
// needed anywhere else in the app yet.
function ProfileListItem({
  username,
  displayName,
  avatarUrl,
}: {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}) {
  const initials = (displayName ?? username ?? "?").slice(0, 2).toUpperCase();
  return (
    <li className="flex items-center gap-3 p-4">
      <Avatar className="h-9 w-9">
        <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? username} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <Link
        href={`/u/${username}`}
        className="font-medium text-primary underline underline-offset-4 hover:text-accent"
      >
        {displayName ?? username}
      </Link>
    </li>
  );
}

// "saved" is only ever a valid *value* here — the tab trigger itself is
// still owner-gated below, so a stranger passing ?tab=saved just falls
// through with no matching trigger to select (Tabs quietly no-ops).
const TAB_VALUES = ["books", "scrapbook", "saved"] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}): Promise<Metadata> {
  const { locale, username } = await params;
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, avatar_url")
    .eq("username", username)
    .single();

  if (!profile) return {};

  const title = `${profile.display_name ?? username} (@${username}) — Storyloom`;
  return {
    title,
    description: profile.bio ?? undefined,
    alternates: { canonical: `/${locale}/u/${username}` },
    openGraph: {
      title,
      description: profile.bio ?? undefined,
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
  };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale, username } = await params;
  const { tab } = await searchParams;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!profile) notFound();

  const { data: claims } = await supabase.auth.getClaims();
  const isOwner = claims?.claims?.sub === profile.id;

  // Lets a link jump straight to a specific tab (e.g. a reported scrapbook
  // entry from the admin reports page) via ?tab=scrapbook — falls back to
  // "books" for anything missing, not a real tab value, or ("saved") not
  // available to this particular viewer.
  const requestedTab = TAB_VALUES.includes(tab as (typeof TAB_VALUES)[number])
    ? (tab as (typeof TAB_VALUES)[number])
    : "books";
  const initialTab = requestedTab === "saved" && !isOwner ? "books" : requestedTab;
  const updateWithUsername = updateProfile.bind(null, username, locale);

  // Only that author's published books — a visitor should never see a
  // stranger's drafts just by discovering their profile.
  const { data: books } = await supabase
    .from("books")
    .select("id, title, genre, cover_image_url, is_mature")
    .eq("author_id", profile.id)
    .eq("is_published", true)
    .order("last_pushed_at", { ascending: false });
  const rankings = await getBookRankingsLookup(supabase);
  const savedBookIds = await getSavedBookIds(supabase, claims?.claims?.sub ?? null);

  // Only fetched for the owner's own view — RLS would return nothing for
  // anyone else anyway (saved_books select policy is auth.uid() = user_id),
  // but there's no point issuing the query at all for a visitor.
  const { data: savedBooks } = isOwner
    ? await supabase
        .from("saved_books")
        .select(
          "book_id, books!inner(id, title, genre, cover_image_url, is_mature, is_published)",
        )
        .eq("user_id", profile.id)
        .eq("books.is_published", true)
    : { data: null };

  const { data: entries } = await supabase
    .from("scrapbook_entries")
    .select(
      "id, content, author_id, created_at, profiles!scrapbook_entries_author_id_fkey(username, display_name)",
    )
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  // Only relevant to a signed-in visitor looking at someone else's page —
  // skipped entirely for the owner (Follow yourself makes no sense) and for
  // logged-out visitors (claims.sub would be undefined anyway).
  let isFollowing = false;
  if (claims?.claims && !isOwner) {
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("*")
      .eq("follower_id", claims.claims.sub)
      .eq("followed_id", profile.id)
      .maybeSingle();
    isFollowing = !!existingFollow;
  }

  const { data: followers } = await supabase
    .from("follows")
    .select("profiles!follows_follower_id_fkey(username, display_name, avatar_url)")
    .eq("followed_id", profile.id);

  const { data: following } = await supabase
    .from("follows")
    .select("profiles!follows_followed_id_fkey(username, display_name, avatar_url)")
    .eq("follower_id", profile.id);

  return (
    <div className="space-y-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <EditableProfileHeader
          profile={profile}
          isOwner={isOwner}
          onSave={updateWithUsername}
        />
        {claims?.claims && !isOwner && (
          <FollowButton
            followedId={profile.id}
            username={username}
            locale={locale}
            initialIsFollowing={isFollowing}
          />
        )}
      </div>

      {/* X-style stat row, not tabs — the counts themselves are the useful
          at-a-glance info; the actual lists are secondary, so they live
          behind a dialog rather than taking up two full tab slots. */}
      <div className="flex gap-4 text-sm">
        <FollowListDialog
          count={following?.length ?? 0}
          label="Following"
          title={`${profile.display_name ?? username}'s following`}
        >
          <ul className="divide-y">
            {following?.map((f) => (
              <ProfileListItem
                key={f.profiles.username}
                username={f.profiles.username}
                displayName={f.profiles.display_name}
                avatarUrl={f.profiles.avatar_url}
              />
            ))}
            {following?.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">
                Not following anyone yet.
              </li>
            )}
          </ul>
        </FollowListDialog>
        <FollowListDialog
          count={followers?.length ?? 0}
          label={followers?.length === 1 ? "Follower" : "Followers"}
          title={`${profile.display_name ?? username}'s followers`}
        >
          <ul className="divide-y">
            {followers?.map((f) => (
              <ProfileListItem
                key={f.profiles.username}
                username={f.profiles.username}
                displayName={f.profiles.display_name}
                avatarUrl={f.profiles.avatar_url}
              />
            ))}
            {followers?.length === 0 && (
              <li className="p-4 text-sm text-muted-foreground">
                No followers yet.
              </li>
            )}
          </ul>
        </FollowListDialog>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="scrapbook">Scrapbook</TabsTrigger>
          {isOwner && <TabsTrigger value="saved">Saved</TabsTrigger>}
        </TabsList>

        <TabsContent value="books">
          <ul className="divide-y rounded border">
            {books?.map((book) => {
              const ranking = rankings.get(book.id);
              return (
                <BookListItem
                  key={book.id}
                  href={`/books/${withSlug(book.id, book.title)}`}
                  coverImageUrl={book.cover_image_url}
                  title={book.title}
                  isMature={book.is_mature}
                  meta={book.genre}
                  rankBadge={
                    ranking
                      ? { rank: ranking.rank, genreLabel: genreLabelFor(book.genre) }
                      : undefined
                  }
                  stats={
                    ranking
                      ? {
                          views: ranking.uniqueViews,
                          likes: ranking.uniqueLikes,
                          comments: ranking.uniqueCommenters,
                        }
                      : undefined
                  }
                  saveButton={
                    claims?.claims ? (
                      <SaveButton
                        bookId={book.id}
                        initialIsSaved={savedBookIds.has(book.id)}
                        variant="icon"
                      />
                    ) : undefined
                  }
                  trailing={
                    isOwner ? (
                      <Link
                        href={`/dashboard/books/${book.id}`}
                        className="flex items-center gap-1 text-xs text-primary underline underline-offset-4 hover:text-accent"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </Link>
                    ) : undefined
                  }
                />
              );
            })}
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

        {isOwner && (
          <TabsContent value="saved">
            <ul className="divide-y rounded border">
              {savedBooks?.map(({ books: book }) => {
                const ranking = rankings.get(book.id);
                return (
                  <BookListItem
                    key={book.id}
                    href={`/books/${withSlug(book.id, book.title)}`}
                    coverImageUrl={book.cover_image_url}
                    title={book.title}
                    isMature={book.is_mature}
                    meta={book.genre}
                    rankBadge={
                      ranking
                        ? { rank: ranking.rank, genreLabel: genreLabelFor(book.genre) }
                        : undefined
                    }
                    stats={
                      ranking
                        ? {
                            views: ranking.uniqueViews,
                            likes: ranking.uniqueLikes,
                            comments: ranking.uniqueCommenters,
                          }
                        : undefined
                    }
                    saveButton={
                      <SaveButton bookId={book.id} initialIsSaved variant="icon" />
                    }
                  />
                );
              })}
              {savedBooks?.length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">
                  No saved books yet.
                </li>
              )}
            </ul>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
