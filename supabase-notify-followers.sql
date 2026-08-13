-- Run this in the Supabase SQL editor for the talehollow project.
--
-- notify_followers_for_book() — this function was referenced by
-- dashboard/books/[id]/chapters/actions.ts (called on every chapter
-- publish) and described in the original Phase 15 tutorial, but was never
-- actually applied to the live database: `supabase.rpc(...)` was silently
-- failing every single call (PGRST202, function not found) since the
-- calling code never checks the returned `error`. Net effect: followers
-- have never actually been notified of a new chapter, silently, since this
-- feature was believed to be shipped. Confirmed live via a direct RPC call
-- returning PGRST202 before this fix.
--
-- Same throttle logic as the original design (at most one notification
-- blast per book per calendar day, via created_at::date = current_date),
-- but written to the stricter, current security-best-practice shape used
-- elsewhere in this repo (delete_own_account, export_own_data):
-- set search_path = '' + fully-qualified public.* names, and an explicit
-- grant, rather than relying on Postgres's default PUBLIC execute grant on
-- newly created functions (which is what let this go unnoticed for so
-- long — the original tutorial version had no explicit grant either, and
-- record_chapter_publish, its sibling, works fine without one; the gap
-- here was that this function was never created live at all, not a grants
-- issue).
create or replace function notify_followers_for_book(p_book_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_author_id uuid;
  v_already_notified_today boolean;
begin
  select author_id into v_author_id from public.books where id = p_book_id;

  -- Same-day throttle, not Phase 8's 24h rolling window — a deliberately
  -- simpler, different boundary, per the original spec.
  select exists (
    select 1 from public.notifications
    where book_id = p_book_id
      and created_at::date = current_date
  ) into v_already_notified_today;

  if v_already_notified_today then
    return;
  end if;

  -- Fan out: one notification row per follower. type = 'chapter_published'
  -- is required (notifications.type is not-null) — the original tutorial
  -- SQL predates that column existing and never set it, which alone would
  -- have made this insert fail even if the function itself had been
  -- created as originally written.
  insert into public.notifications (user_id, book_id, type)
  select follower_id, p_book_id, 'chapter_published'
  from public.follows
  where followed_id = v_author_id;
end;
$$;

grant execute on function notify_followers_for_book(uuid) to authenticated;
