-- Rooted: end-to-end encrypted notes.
-- The app locks every note in the browser before sending it, with a key only the writer
-- has. The database (and anyone with dashboard or SQL access, the admin included) only
-- ever sees scrambled text in `sealed`. Points and dates stay readable, because the
-- tree and the progress squares need them.
--
-- Run after the earlier migrations (SQL Editor -> paste -> Run). Safe to run twice.
-- After this, the database refuses notes that aren't locked, so update the app too.

-- ---------- each person's note key, itself locked ----------
-- `wrapped` is the note key locked with a key made from the person's password,
-- `recovery` the same key locked with their recovery key. Neither opens without those.
create table if not exists public.note_keys (
  user_id       uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  salt          text not null,
  iterations    integer not null check (iterations >= 100000),
  wrapped       text not null,
  recovery_salt text,
  recovery      text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.note_keys enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'note_keys' and policyname = 'Read own key') then
    create policy "Read own key" on public.note_keys
      for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'note_keys' and policyname = 'Create own key') then
    create policy "Create own key" on public.note_keys
      for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'note_keys' and policyname = 'Change own key') then
    create policy "Change own key" on public.note_keys
      for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
end;
$$;

revoke all on public.note_keys from anon, authenticated;
grant select on public.note_keys to authenticated;
grant insert (salt, iterations, wrapped, recovery_salt, recovery) on public.note_keys to authenticated;
grant update (salt, iterations, wrapped, recovery_salt, recovery, updated_at) on public.note_keys to authenticated;

-- ---------- notes: the locked text ----------
alter table public.entries add column if not exists sealed text;

-- Every new or changed note must be locked, and a locked note carries no readable text
-- (subject is just the word 'locked'). NOT VALID: notes saved before this update are let
-- through until the app locks them, which it does the next time their owner opens it.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'entries_must_be_sealed' and conrelid = 'public.entries'::regclass) then
    alter table public.entries
      add constraint entries_must_be_sealed
      check (sealed is not null and char_length(sealed) <= 300000 and subject = 'locked' and note = '' and tags = '{}')
      not valid;
  end if;
end;
$$;

-- The app sends the locked text, and swaps old readable notes for locked ones (owner only).
grant insert (id, sealed) on public.entries to authenticated;
grant update (subject, note, tags, sealed) on public.entries to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'entries' and policyname = 'Lock own entries') then
    create policy "Lock own entries" on public.entries
      for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
end;
$$;

notify pgrst, 'reload schema';

-- Optional, later: once every member has opened the app once, all old notes are locked.
-- Check with:  select count(*) from public.entries where sealed is null;
-- When that is 0, make the rule cover every row:
--   alter table public.entries validate constraint entries_must_be_sealed;
