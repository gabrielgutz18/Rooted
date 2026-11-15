-- Rooted: notes written offline are uploaded later by the app.
--  - The app may send the note's id (a UUID it made on the device) so a retry after a
--    dropped connection can never save the same note twice.
--  - It may send created_at so the note keeps the time it was written. The server only
--    accepts times from the last 14 days up to now; anything else becomes "now", so
--    nobody can backdate notes to fake a streak.
-- Run after the earlier migrations (SQL Editor -> paste -> Run).

grant insert (id, created_at) on public.entries to authenticated;

create or replace function public.clamp_entry_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_at is null
     or new.created_at > now()
     or new.created_at < now() - interval '14 days' then
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists entries_clamp_time on public.entries;
create trigger entries_clamp_time
  before insert on public.entries
  for each row execute function public.clamp_entry_time();

revoke execute on function public.clamp_entry_time() from public, anon, authenticated;
