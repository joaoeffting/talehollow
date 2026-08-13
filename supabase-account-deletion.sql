-- Run this in the Supabase SQL editor for the talehollow project.
--
-- Lets a signed-in user delete their own account and everything tied to it,
-- in one atomic transaction. Almost none of the tables that reference
-- profiles(id) do so with "on delete cascade" (only saved_books and a
-- user's own scrapbook wall do) — so a plain `delete from auth.users` would
-- just fail with a foreign-key violation the moment the account has ever
-- published, commented, liked, or followed anything. This function deletes
-- everything in the right order instead.
--
-- security definer: ordinary users have no delete rights on auth.users at
-- all — this function runs with the privileges of whoever created it
-- (normally a superuser-ish role via the SQL editor), but captures
-- auth.uid() into a local variable up front and only ever acts on that one
-- id, so a caller can only ever delete their own account, never anyone
-- else's.
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- reports.target_id is a plain uuid (Phase 16: reports can point at
  -- three different content types, enforced by a check constraint, not a
  -- real foreign key) — so this has to be resolved by hand, and has to run
  -- before the books/scrapbook_entries deletes below or the lookup here
  -- would find nothing.
  delete from reports
  where reporter_id = v_uid
     or target_id in (
          select id from books where author_id = v_uid
          union
          select id from chapters where book_id in (select id from books where author_id = v_uid)
          union
          select id from scrapbook_entries where author_id = v_uid
        );

  -- user_id = recipient, actor_id = whoever triggered it (e.g. "X liked
  -- your chapter") — a column this project added after the original Phase
  -- 15 tutorial was written, confirmed against the live schema's actual
  -- foreign keys (database.types.ts's Relationships), not the tutorial doc.
  delete from notifications where user_id = v_uid or actor_id = v_uid;
  delete from likes where user_id = v_uid;
  delete from views where user_id = v_uid;
  delete from comments where user_id = v_uid;
  delete from follows where follower_id = v_uid or followed_id = v_uid;
  -- Entries THEY wrote on someone else's wall. Entries on their OWN wall
  -- (profile_id = v_uid) are cascade-deleted for free once profiles goes.
  delete from scrapbook_entries where author_id = v_uid;
  -- Cascades to chapters, and from there to that book's own
  -- views/likes/comments/notifications — see Phase 4/9/10/15's
  -- `on delete cascade` on chapter_id/book_id.
  delete from books where author_id = v_uid;

  -- Cascades to profiles (Phase 2), and from there to saved_books and any
  -- scrapbook entries on their own wall.
  delete from auth.users where id = v_uid;
end;
$$;

grant execute on function delete_own_account() to authenticated;
