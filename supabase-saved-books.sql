-- Run this in the Supabase SQL editor for the talehollow dev project.
-- Mirrors the existing follows table's shape: composite primary key, no
-- separate id column, RLS scoped to the signed-in user.

create table public.saved_books (
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

alter table public.saved_books enable row level security;

create policy "Users can view their own saved books"
  on public.saved_books for select
  using (auth.uid() = user_id);

create policy "Users can save books"
  on public.saved_books for insert
  with check (auth.uid() = user_id);

create policy "Users can unsave books"
  on public.saved_books for delete
  using (auth.uid() = user_id);
