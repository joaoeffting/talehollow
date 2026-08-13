-- Run this in the Supabase SQL editor for the talehollow project.
--
-- Lets an author showcase finished books they sell elsewhere (Amazon, etc.)
-- on their profile — cover, synopsis, and a buy link, shown as a carousel
-- right above the Books/Scrapbook/Saved tabs. Deliberately its own table,
-- not a row in `books`: these aren't Talehollow books with chapters and a
-- reader, just a showcase card pointing off-platform.
create table public.external_books (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  cover_url text,
  title text not null check (char_length(trim(title)) between 1 and 200),
  synopsis text check (synopsis is null or char_length(synopsis) <= 1000),
  -- http(s)-only — this is rendered straight into an <a href>, so it's worth
  -- ruling out a javascript: URL at the database boundary rather than
  -- trusting every render site to re-check it.
  buy_url text not null check (buy_url ~* '^https?://'),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index external_books_profile_id_idx on public.external_books (profile_id);

alter table public.external_books enable row level security;

-- Public select — this is a showcase meant to be seen by any visitor to the
-- profile, logged in or not, same as books.is_published = true rows.
create policy "Anyone can view external books"
  on public.external_books for select
  to authenticated, anon
  using (true);

create policy "Users can add their own external books"
  on public.external_books for insert
  to authenticated
  with check ((select auth.uid()) = profile_id);

create policy "Users can edit their own external books"
  on public.external_books for update
  to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

create policy "Users can delete their own external books"
  on public.external_books for delete
  to authenticated
  using ((select auth.uid()) = profile_id);

-- Storage: a public bucket (covers need to be viewable by any visitor, same
-- as book-covers/avatars), one folder per user (path is
-- "<user_id>/<external_book_id>.<ext>") — write access is scoped by folder
-- name matching the caller's own uid, same shape as book-covers/avatars use
-- (folder name there is the book/user id instead).
insert into storage.buckets (id, name, public)
values ('external-book-covers', 'external-book-covers', true)
on conflict (id) do nothing;

create policy "Users can upload their own external book covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'external-book-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can replace their own external book covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'external-book-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'external-book-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users can delete their own external book covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'external-book-covers'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
