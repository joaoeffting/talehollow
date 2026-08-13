-- Run this in the Supabase SQL editor for the talehollow project.
--
-- Lets an author flag a book as containing mature content, with an optional
-- free-text note on specifics (e.g. "graphic violence, discussion of
-- self-harm"). Book-level, not per-chapter — matches how the genre field
-- and cover image already work, and mirrors how most serialized-fiction
-- platforms handle this (a book-wide flag, not a per-chapter one).
--
-- Deliberately just a flag + free text, not a fixed taxonomy of warning
-- categories (violence/sexual content/self-harm/etc. as separate columns
-- or a join table) — that's a bigger feature (filtering UI, a real tag
-- table) than "have a way to flag explicit content at all" calls for.
alter table books
  add column is_mature boolean not null default false,
  add column content_warning text;
