-- Rooted: members can put their real name on their profile (Menu → My profile → Your name).
-- It's the name friends see beside their tree; they still sign in with their username.
--
-- Run after the earlier migrations (SQL Editor -> paste -> Run). Safe to run twice.
-- Until it is run the app keeps working; saving a name just asks for this update.

-- A name is 1–40 characters already (the first migration). Also: no spaces at either end and
-- no line breaks or other control characters, as the app saves it (src/lib/names.ts).
-- "not valid": names saved before aren't checked, only new ones.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_display_name_clean' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles
      add constraint profiles_display_name_clean
      check (display_name = btrim(display_name) and display_name !~ '[[:cntrl:]]') not valid;
  end if;
end;
$$;

-- Members may change their own name ("Update own profile" already limits it to their row).
grant update (display_name) on public.profiles to authenticated;

-- Shows the update rights members have on profiles now; it should list avatar, display_name and tree
select column_name from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated' and privilege_type = 'UPDATE'
  order by column_name;
