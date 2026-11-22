-- Fix: picking a profile icon failed with
--   new row for relation "profiles" violates check constraint "profiles_avatar_name".
-- The live database had an older, stricter version of that check (made before icons could
-- sit on a coloured tile, e.g. 'crown.navy'). 20261121000000_avatars.sql only adds the check
-- when it is missing, so running it again never replaced the old one. This puts in the
-- right one: 'crown', 'crown.navy' or 'letter.mint' (see src/lib/avatars.ts).
--
-- Run after the earlier migrations (SQL Editor -> paste -> Run). Safe to run twice.
-- The dashboard may ask to confirm a "destructive operation" (it swaps the check): confirm it.

alter table public.profiles drop constraint if exists profiles_avatar_name;

-- anything already saved that the app wouldn't write goes back to "no icon yet"
update public.profiles set avatar = null
  where avatar is not null and avatar !~ '^[a-z]{1,24}([.][a-z]{1,12})?$';

alter table public.profiles
  add constraint profiles_avatar_name check (avatar is null or avatar ~ '^[a-z]{1,24}([.][a-z]{1,12})?$');

-- Shows the check now in place; it should end in ([.][a-z]{1,12})?$
select pg_get_constraintdef(oid) as profiles_avatar_name
  from pg_constraint where conname = 'profiles_avatar_name' and conrelid = 'public.profiles'::regclass;
