-- Run this in the Supabase SQL editor for the talehollow project.
--
-- Lets a signed-in user download a copy of their own data (GDPR Art. 20,
-- the counterpart to delete_own_account() in supabase-account-deletion.sql
-- — same reasoning applies to why this can't just be a client-side query
-- against each table).
--
-- security definer, same shape as delete_own_account(): captures auth.uid()
-- once and only ever acts on that one id, so a caller can only ever export
-- their own data. One real reason a plain client-side query wouldn't work
-- here specifically: `reports` is admin-read-only by RLS (Phase 16 — "nobody
-- can read reports by default except is_admin"), so a reporter can't even
-- see the reports they filed themselves without this bypassing that policy
-- for their own reporter_id rows.
--
-- set search_path = '' + fully-qualified public.* table names, rather than
-- set search_path = public (the pattern the older delete_own_account() used)
-- — the stricter of the two recommended patterns, since an empty search
-- path can't be influenced by a role-level search_path setting at all.
create or replace function export_own_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  result jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select jsonb_build_object(
    'exported_at', now(),
    -- is_admin left out — a moderation flag, not personal data.
    'profile', (
      select to_jsonb(p) - 'is_admin'
      from public.profiles p where p.id = v_uid
    ),
    'books', (
      select coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
      from public.books b where b.author_id = v_uid
    ),
    'chapters', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
      from public.chapters c
      where c.book_id in (select id from public.books where author_id = v_uid)
    ),
    'comments', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
      from public.comments c where c.user_id = v_uid
    ),
    'likes', (
      select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
      from public.likes l where l.user_id = v_uid
    ),
    'views', (
      select coalesce(jsonb_agg(to_jsonb(v)), '[]'::jsonb)
      from public.views v where v.user_id = v_uid
    ),
    'following', (
      select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
      from public.follows f where f.follower_id = v_uid
    ),
    'followers', (
      select coalesce(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
      from public.follows f where f.followed_id = v_uid
    ),
    'notifications_received', (
      select coalesce(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
      from public.notifications n where n.user_id = v_uid
    ),
    'reports_filed', (
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
      from public.reports r where r.reporter_id = v_uid
    ),
    'scrapbook_entries_written', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      from public.scrapbook_entries s where s.author_id = v_uid
    ),
    'saved_books', (
      select coalesce(jsonb_agg(to_jsonb(sb)), '[]'::jsonb)
      from public.saved_books sb where sb.user_id = v_uid
    )
  ) into result;

  return result;
end;
$$;

grant execute on function export_own_data() to authenticated;
