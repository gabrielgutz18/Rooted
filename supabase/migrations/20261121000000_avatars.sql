-- Profile icons: each member can pick a little pixel picture (a bottle, a crown, a book…)
-- on a coloured tile, shown next to their name for them and their friends. Only names are
-- stored: 'crown', 'crown.navy' (on navy) or 'letter.mint' (their first letter on mint);
-- the pictures themselves live in the app (src/lib/avatars.ts).
--
-- Run after the earlier migrations (SQL Editor -> paste -> Run). Safe to run twice.
-- Until it is run the app keeps working; picking an icon just asks for this update.

alter table public.profiles add column if not exists avatar text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_avatar_name' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles
      add constraint profiles_avatar_name check (avatar is null or avatar ~ '^[a-z]{1,24}([.][a-z]{1,12})?$');
  end if;
end;
$$;

-- Members may change their own icon ("Update own profile" already limits it to their row).
grant update (avatar) on public.profiles to authenticated;
