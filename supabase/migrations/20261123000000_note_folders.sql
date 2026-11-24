-- Rooted: note folders. Each member can make folders (a name and a colour) in My notes and
-- drag their notes into them.
--
-- Like the notes, folders are end-to-end encrypted. The app keeps each member's whole "desk"
-- (their folders, and which note is in which) as one value, locked in the browser with their
-- note key. The database only ever holds the scrambled text in `sealed`: nobody with database
-- access, the admin included, can read a folder's name or tell which notes are in it.
--
-- Run after the earlier migrations (SQL Editor -> paste -> Run). Safe to run twice.
-- Until it is run the app keeps working; making a folder just asks for this update.

create table if not exists public.note_desks (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  sealed     text not null check (sealed like 'v1.%' and char_length(sealed) <= 2000000),
  updated_at timestamptz not null default now()
);

alter table public.note_desks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'note_desks' and policyname = 'Read own desk') then
    create policy "Read own desk" on public.note_desks
      for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'note_desks' and policyname = 'Create own desk') then
    create policy "Create own desk" on public.note_desks
      for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'note_desks' and policyname = 'Change own desk') then
    create policy "Change own desk" on public.note_desks
      for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
end;
$$;

-- updated_at always comes from the server's clock
create or replace function public.touch_note_desk()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists note_desks_touch on public.note_desks;
create trigger note_desks_touch
  before insert or update on public.note_desks
  for each row execute function public.touch_note_desk();

revoke all on public.note_desks from anon, authenticated;
grant select on public.note_desks to authenticated;
-- (an upsert also writes user_id on update; the policies keep it the member's own)
grant insert (user_id, sealed), update (user_id, sealed) on public.note_desks to authenticated;
revoke execute on function public.touch_note_desk() from public, anon, authenticated;

notify pgrst, 'reload schema';
