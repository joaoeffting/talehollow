-- Run this in the Supabase SQL editor for the storyloom project.
--
-- Lets a signed-in reader/author send free-text feedback or suggestions.
-- Deliberately just a text box + a table, no ticketing workflow — reviewed_at
-- is the only bit of state, toggled from /admin/feedback so seen-vs-unseen
-- is visible at a glance without needing real email delivery wired up yet
-- (that's a separate, later step once an email provider is picked).
--
-- on delete cascade (not a manual delete in delete_own_account(), see that
-- function's own comment on which tables do/don't need to be listed there)
-- — mirrors saved_books' shape for the same reason: a user's feedback rows
-- disappear for free when their account does.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 5000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index feedback_user_id_idx on public.feedback (user_id);
create index feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Insert-only for regular users — same shape as the reports table (a
-- reporter can't read reports back either): feedback is a one-way mailbox
-- to the admin, not a message thread.
create policy "Users can submit feedback"
  on public.feedback for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Admins can view feedback"
  on public.feedback for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.is_admin
    )
  );

-- UPDATE policies need both using and with check (see supabase-postgres-
-- best-practices skill) — using gates which rows an admin can even see to
-- update (also doubles as the required select-for-update policy), with
-- check stops the update itself from being abused to do something else.
-- Nothing here actually changes user_id/content, but the check is cheap
-- insurance against a future update statement doing more than intended.
create policy "Admins can mark feedback reviewed"
  on public.feedback for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.is_admin
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid()) and profiles.is_admin
    )
  );
