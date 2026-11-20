-- Rooted: each member can pin one of their notes to their profile, to share it.
-- The pinned note shows under their tree for every signed-in member (and in their profile).
--
-- Notes are end-to-end encrypted, so the database can't read them. Sharing one is a choice the
-- member makes: the app saves a readable copy of that one note here. The note in their diary
-- stays locked. Unpinning deletes the copy; deleting the note deletes it too (cascade).
--
-- Run after the earlier migrations (SQL Editor -> paste -> Run). Safe to run twice.
-- Until it is run the app keeps working; pinning a note just asks for this update.

create table if not exists public.shared_notes (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  entry_id   uuid not null references public.entries (id) on delete cascade,
  subject    text not null check (char_length(subject) between 1 and 200),
  note       text not null default '' check (char_length(note) <= 20000),
  tags       text[] not null default '{}' check (cardinality(tags) <= 20),
  -- copied from the note itself by the trigger below, never from the app
  points     integer not null default 0,
  written_at timestamptz not null default now(),
  shared_at  timestamptz not null default now()
);

create index if not exists shared_notes_entry_idx on public.shared_notes (entry_id);

alter table public.shared_notes enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shared_notes' and policyname = 'Members see shared notes') then
    create policy "Members see shared notes" on public.shared_notes
      for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shared_notes' and policyname = 'Pin own note') then
    create policy "Pin own note" on public.shared_notes
      for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shared_notes' and policyname = 'Change own pinned note') then
    create policy "Change own pinned note" on public.shared_notes
      for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'shared_notes' and policyname = 'Unpin own note') then
    create policy "Unpin own note" on public.shared_notes
      for delete to authenticated using ((select auth.uid()) = user_id);
  end if;
end;
$$;

-- Only one's own note can be pinned, and its points and date come from that note.
-- shared_at moves only when a different note is pinned (editing the words keeps it).
create or replace function public.check_shared_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
begin
  select en.user_id, en.points, en.created_at into e from public.entries en where en.id = new.entry_id;
  if not found or e.user_id is distinct from new.user_id then
    raise exception 'You can only pin your own notes.';
  end if;
  new.points := e.points;
  new.written_at := e.created_at;
  if tg_op = 'INSERT' then
    new.shared_at := now();
  elsif new.entry_id is distinct from old.entry_id then
    new.shared_at := now();
  else
    new.shared_at := old.shared_at;
  end if;
  return new;
end;
$$;

drop trigger if exists shared_notes_check on public.shared_notes;
create trigger shared_notes_check
  before insert or update on public.shared_notes
  for each row execute function public.check_shared_note();

revoke all on public.shared_notes from anon, authenticated;
grant select, delete on public.shared_notes to authenticated;
-- (an upsert also writes user_id on update; the policy keeps it the person's own)
grant insert (user_id, entry_id, subject, note, tags), update (user_id, entry_id, subject, note, tags) on public.shared_notes to authenticated;
revoke execute on function public.check_shared_note() from public, anon, authenticated;

notify pgrst, 'reload schema';
