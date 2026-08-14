-- One-time bootstrap for a FRESH dev/staging Supabase project (e.g.
-- talehollow-dev). Not part of the normal supabase-<feature>.sql sequence —
-- this recreates the whole schema in one shot instead of layering one
-- feature at a time, since a fresh project has nothing to layer onto.
--
-- Built from two reliable sources: src/utils/supabase/database.types.ts
-- (a direct introspection of the real prod database — table/column shapes
-- here are exact) and every supabase-*.sql file already in this repo
-- (copied in verbatim, already applied to prod as-is).
--
-- Sections marked RECONSTRUCTED predate this repo's supabase-*.sql
-- convention and aren't captured anywhere in code — they're rebuilt from
-- everything discussed/verified about their behavior this session, not
-- copied from a source of truth. Verify these specifically after applying
-- (see the checklist at the bottom) rather than trusting them blind.
--
-- Run this whole file once, top to bottom, in the SQL Editor of a brand
-- new project. Do NOT run this against prod — it will error on every
-- `create table` since those already exist there.

-- ============================================================
-- profiles (+ the auth signup trigger — RECONSTRUCTED)
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  bio text,
  avatar_url text,
  is_admin boolean not null default false,
  ui_language text not null default 'en',
  content_language text not null default 'en',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are publicly viewable"
  on public.profiles for select
  to authenticated, anon
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- RECONSTRUCTED: creates the profiles row on signup, reading username/
-- locale out of the signup() Server Action's `options.data`
-- (src/app/[locale]/login/actions.ts). This is the piece most likely to
-- need a tweak if signup misbehaves after applying this file.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, ui_language, content_language)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'locale', 'en'),
    coalesce(new.raw_user_meta_data ->> 'locale', 'en')
  );
  return new;
end;
$$;

-- SECURITY DEFINER functions grant EXECUTE to PUBLIC by default — fine for
-- the RPCs meant to be called directly (record_view, delete_own_account,
-- etc., each of which captures auth.uid() internally), but this one should
-- only ever run via the trigger below, never as a direct
-- /rest/v1/rpc/handle_new_user call. Caught by `supabase db advisors`.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- books, chapters
-- ============================================================

create table public.books (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  genre text not null,
  language text not null default 'en',
  synopsis text,
  cover_image_url text,
  is_published boolean not null default false,
  is_mature boolean not null default false,
  content_warning text,
  last_pushed_at timestamptz,
  last_updated_at timestamptz,
  created_at timestamptz default now()
);

create index books_author_id_idx on public.books (author_id);

alter table public.books enable row level security;

create policy "Published books are publicly viewable"
  on public.books for select
  to authenticated, anon
  using (is_published = true or author_id = (select auth.uid()));

create policy "Authors can create their own books"
  on public.books for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

create policy "Authors can update their own books"
  on public.books for update
  to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "Authors can delete their own books"
  on public.books for delete
  to authenticated
  using ((select auth.uid()) = author_id);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null,
  content text,
  position integer not null,
  is_published boolean not null default false,
  anon_view_count integer not null default 0,
  created_at timestamptz default now()
);

create index chapters_book_id_idx on public.chapters (book_id);

alter table public.chapters enable row level security;

create policy "Published chapters are publicly viewable"
  on public.chapters for select
  to authenticated, anon
  using (
    is_published = true
    or exists (select 1 from public.books where id = book_id and author_id = (select auth.uid()))
  );

-- Split into insert/update/delete rather than "for all" — a "for all"
-- policy also grants select, which then overlaps with the public-viewable
-- policy above (both apply to `authenticated` for SELECT) and makes
-- Postgres evaluate two permissive policies per read. Caught by
-- `supabase db advisors`.
create policy "Authors can insert their own chapters"
  on public.chapters for insert
  to authenticated
  with check (exists (select 1 from public.books where id = book_id and author_id = (select auth.uid())));

create policy "Authors can update their own chapters"
  on public.chapters for update
  to authenticated
  using (exists (select 1 from public.books where id = book_id and author_id = (select auth.uid())))
  with check (exists (select 1 from public.books where id = book_id and author_id = (select auth.uid())));

create policy "Authors can delete their own chapters"
  on public.chapters for delete
  to authenticated
  using (exists (select 1 from public.books where id = book_id and author_id = (select auth.uid())));

-- ============================================================
-- engagement: comments, likes, views, anon_view_dedup, follows
-- ============================================================

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index comments_chapter_id_idx on public.comments (chapter_id);
create index comments_book_id_idx on public.comments (book_id);

alter table public.comments enable row level security;

create policy "Comments are publicly viewable"
  on public.comments for select
  to authenticated, anon
  using (true);

create policy "Users can post comments"
  on public.comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own comments"
  on public.comments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (chapter_id, user_id)
);

create index likes_chapter_id_idx on public.likes (chapter_id);
create index likes_book_id_idx on public.likes (book_id);

alter table public.likes enable row level security;

create policy "Likes are publicly viewable"
  on public.likes for select
  to authenticated, anon
  using (true);

create policy "Users can like chapters"
  on public.likes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can unlike chapters"
  on public.likes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table public.views (
  book_id uuid not null references public.books(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  view_count integer not null default 1,
  last_viewed_at timestamptz not null default now(),
  primary key (chapter_id, user_id)
);

create index views_book_id_idx on public.views (book_id);

alter table public.views enable row level security;

create policy "View counts are publicly viewable"
  on public.views for select
  to authenticated, anon
  using (true);

-- No insert/update policy for authenticated/anon here on purpose — writes
-- only ever happen through record_view() below, which is security definer
-- and bypasses RLS.

create table public.anon_view_dedup (
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  viewer_key text not null,
  view_date date not null default current_date,
  primary key (chapter_id, viewer_key, view_date)
);

alter table public.anon_view_dedup enable row level security;
-- Deliberately no policies at all — only record_anon_view() (security
-- definer) ever touches this table; nothing should read/write it directly.

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  followed_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, followed_id)
);

alter table public.follows enable row level security;

create policy "Follows are publicly viewable"
  on public.follows for select
  to authenticated, anon
  using (true);

create policy "Users can follow others"
  on public.follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

-- ============================================================
-- notifications
-- ============================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete cascade,
  book_id uuid references public.books(id) on delete cascade,
  chapter_id uuid references public.chapters(id) on delete cascade,
  type text not null default 'new_follower',
  read_at timestamptz,
  created_at timestamptz default now()
);

create index notifications_user_id_idx on public.notifications (user_id);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- with check on actor_id, not user_id — the person triggering a
-- notification (e.g. a new follower) inserts it FOR someone else
-- (src/app/[locale]/u/[username]/actions.ts's toggleFollow).
create policy "Users can create notifications for others"
  on public.notifications for insert
  to authenticated
  with check ((select auth.uid()) = actor_id);

create policy "Users can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ============================================================
-- reports, scrapbook_entries
-- ============================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('book', 'chapter', 'scrapbook_entry')),
  target_id uuid not null,
  reason text not null,
  created_at timestamptz default now()
);

alter table public.reports enable row level security;

create policy "Users can file reports"
  on public.reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter_id);

-- Admin-only read — a reporter can't read reports back, including their
-- own (see supabase-data-export.sql's own note on this).
create policy "Admins can view reports"
  on public.reports for select
  to authenticated
  using (
    exists (select 1 from public.profiles where id = (select auth.uid()) and is_admin)
  );

create table public.scrapbook_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create index scrapbook_entries_profile_id_idx on public.scrapbook_entries (profile_id);

alter table public.scrapbook_entries enable row level security;

create policy "Scrapbook entries are publicly viewable"
  on public.scrapbook_entries for select
  to authenticated, anon
  using (true);

create policy "Users can post scrapbook entries"
  on public.scrapbook_entries for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

-- Poster OR wall owner can delete (see scrapbook-section.tsx's own comment
-- on this exact policy shape).
create policy "Poster or wall owner can delete a scrapbook entry"
  on public.scrapbook_entries for delete
  to authenticated
  using ((select auth.uid()) = author_id or (select auth.uid()) = profile_id);

-- ============================================================
-- book_rankings view — RECONSTRUCTED, especially the score weights
-- ============================================================

create or replace view public.book_rankings
with (security_invoker = true) as
select
  b.id,
  b.title,
  b.genre,
  b.language,
  b.author_id,
  b.cover_image_url,
  p.username,
  p.display_name,
  count(distinct v.user_id) as unique_views,
  count(distinct l.user_id) as unique_likes,
  count(distinct c.user_id) as unique_commenters,
  (
    count(distinct v.user_id)
    + count(distinct l.user_id) * 3
    + count(distinct c.user_id) * 5
  ) as score
from public.books b
join public.profiles p on p.id = b.author_id
left join public.views v on v.book_id = b.id
left join public.likes l on l.book_id = b.id
left join public.comments c on c.book_id = b.id
where b.is_published = true
group by b.id, p.username, p.display_name;

-- ============================================================
-- anti-spam RPCs — RECONSTRUCTED, verify with npm run test:e2e
-- ============================================================

-- Corrected against the function actually deployed on the linked project
-- (pg_get_functiondef via the Management API) — the version below matches
-- reality; an earlier draft of this reconstruction was missing the WHERE
-- guard entirely, which reads as "every visit counts, forever" and led to
-- a real wrong diagnosis of the homepage-vs-detail-page view count
-- mismatch (src/app/[locale]/books/[id]/page.tsx) before this was checked
-- against the live definition.
create or replace function public.record_view(p_chapter_id uuid, p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  insert into views (chapter_id, book_id, user_id)
  values (p_chapter_id, p_book_id, auth.uid())
  on conflict (chapter_id, user_id) do update
    set view_count = views.view_count + 1, last_viewed_at = now()
    -- The WHERE is what makes this "re-count after 24h" rather than "every
    -- visit is a new view": if the last view was more recent than that, the
    -- DO UPDATE matches zero rows and view_count doesn't move — one atomic
    -- statement, no separate check-then-write race condition.
    where views.last_viewed_at < now() - interval '24 hours';
end;
$$;

grant execute on function public.record_view(uuid, uuid) to authenticated;

create or replace function public.record_anon_view(p_chapter_id uuid, p_viewer_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.anon_view_dedup (chapter_id, viewer_key, view_date)
  values (p_chapter_id, p_viewer_key, current_date)
  on conflict (chapter_id, viewer_key, view_date) do nothing;

  if found then
    update public.chapters set anon_view_count = anon_view_count + 1 where id = p_chapter_id;
  end if;
end;
$$;

grant execute on function public.record_anon_view(uuid, text) to anon, authenticated;

-- 24h feed-push throttle — only bumps last_pushed_at (what the homepage
-- feed orders by) if it's been more than a day since the last push.
create or replace function public.record_chapter_publish(p_book_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last timestamptz;
begin
  select last_pushed_at into v_last from public.books where id = p_book_id;
  if v_last is null or v_last < now() - interval '24 hours' then
    update public.books set last_pushed_at = now(), last_updated_at = now() where id = p_book_id;
    return true;
  end if;
  update public.books set last_updated_at = now() where id = p_book_id;
  return false;
end;
$$;

grant execute on function public.record_chapter_publish(uuid) to authenticated;

-- ============================================================
-- avatars / book-covers storage — RECONSTRUCTED bucket + policies
-- ============================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

insert into storage.buckets (id, name, public)
values ('book-covers', 'book-covers', true)
on conflict (id) do nothing;

create policy "Authors can upload their own book covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'book-covers'
    and exists (
      select 1 from public.books
      where id::text = (storage.foldername(name))[1] and author_id = (select auth.uid())
    )
  );

create policy "Authors can replace their own book covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'book-covers'
    and exists (
      select 1 from public.books
      where id::text = (storage.foldername(name))[1] and author_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'book-covers'
    and exists (
      select 1 from public.books
      where id::text = (storage.foldername(name))[1] and author_id = (select auth.uid())
    )
  );

create policy "Authors can delete their own book covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'book-covers'
    and exists (
      select 1 from public.books
      where id::text = (storage.foldername(name))[1] and author_id = (select auth.uid())
    )
  );

-- ============================================================
-- Everything below this line is copied verbatim from this repo's own
-- supabase-*.sql files (saved_books, content-warnings, account-deletion,
-- data-export, notify-followers, content-warnings, feedback,
-- external-books) — already applied to prod as-is, high confidence.
-- Run each of those files, in this order, right after this one:
--
--   1. supabase-saved-books.sql
--   2. supabase-content-warnings.sql   (alters books, run after books exists)
--   3. supabase-account-deletion.sql
--   4. supabase-data-export.sql
--   5. supabase-notify-followers.sql
--   6. supabase-feedback.sql
--   7. supabase-external-books.sql
-- ============================================================
