-- Rooted: Jesus visits your tree now and then (src/lib/visit.ts). The note written while He
-- is there grows the tree 3×, so one note can now carry up to 180 points instead of 60.
-- Until this runs, such a note is still saved, with 60 points (the app retries with the old cap).
--
-- Run after the earlier migrations (SQL Editor -> paste -> Run). Safe to run twice.
-- The dashboard may ask to confirm a "destructive operation" (it swaps the check): confirm it.

alter table public.entries drop constraint if exists entries_points_check;

alter table public.entries
  add constraint entries_points_check check (points between 0 and 180);

-- Shows the check now in place; it should say 180
select pg_get_constraintdef(oid) as entries_points_check
  from pg_constraint where conname = 'entries_points_check' and conrelid = 'public.entries'::regclass;
