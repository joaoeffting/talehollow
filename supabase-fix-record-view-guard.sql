-- Run this in the Supabase SQL editor for the talehollow-prod project only
-- (dev already has this guard — confirmed via the Management API against
-- both projects' live pg_get_functiondef output while investigating a
-- view-count display bug).
--
-- Prod's record_view() is missing the 24h dedup guard: every logged-in
-- page view increments views.view_count unconditionally, forever, instead
-- of only re-counting a visit that's more than 24h after the last one.
-- This didn't cause the user-visible view-count mismatch (that was a
-- separate app-code bug, already fixed, in how the book detail page read
-- view counts) but it is a real, currently-inactive anti-spam gap on its
-- own, matching what tests/anti-spam.spec.ts already expects and tests
-- against on dev.
--
-- Keeps prod's existing parameter names/order (p_book_id, p_chapter_id) —
-- CREATE OR REPLACE can't rename parameters even when types match
-- (42P13), and the app calls this via named arguments anyway, so the
-- order was never functionally significant. Only the body changes.

create or replace function public.record_view(p_book_id uuid, p_chapter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;
  insert into public.views (book_id, chapter_id, user_id, view_count, last_viewed_at)
  values (p_book_id, p_chapter_id, v_uid, 1, now())
  on conflict (chapter_id, user_id) do update
    set view_count = public.views.view_count + 1, last_viewed_at = now()
    -- The WHERE is what makes this "re-count after 24h" rather than "every
    -- visit is a new view": if the last view was more recent than that, the
    -- DO UPDATE matches zero rows and view_count doesn't move — one atomic
    -- statement, no separate check-then-write race condition.
    where public.views.last_viewed_at < now() - interval '24 hours';
end;
$$;

-- Same signature as before, so the existing grant from the original
-- bootstrap still applies — no re-grant needed.
