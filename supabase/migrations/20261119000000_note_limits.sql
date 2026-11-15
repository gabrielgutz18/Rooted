-- Rooted: nobody can fill the database with notes.
-- Notes are locked on the device, so the server can't tell a real note from random typing;
-- the app checks that (src/lib/spam.ts), and allows one note a minute and 10 in any 24 hours.
-- This is the backstop for anyone who skips the app and calls the API directly:
-- a note is refused when 10 notes already sit in the 24 hours before it, or in the 24 hours
-- after it. Both sides count because notes written offline arrive later with an earlier
-- time. Notes saved through the app never hit this.
--
-- Run after the earlier migrations (SQL Editor -> paste -> Run). Safe to run twice.

create or replace function public.limit_entry_rate()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  most constant integer := 10;
begin
  -- one note at a time per person, so two sent at once can't both slip under the limit
  perform pg_advisory_xact_lock(hashtextextended('entries:' || new.user_id::text, 0));

  if (select count(*) from public.entries e
      where e.user_id = new.user_id
        and e.created_at > new.created_at - interval '24 hours'
        and e.created_at <= new.created_at) >= most
     or (select count(*) from public.entries e
      where e.user_id = new.user_id
        and e.created_at > new.created_at
        and e.created_at < new.created_at + interval '24 hours') >= most
  then
    raise exception 'Too many notes in 24 hours. Try again later.' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  return new;
end;
$$;

-- Fires after entries_clamp_time (triggers run in name order), so it sees the final time.
create or replace trigger entries_rate_limit
  before insert on public.entries
  for each row execute function public.limit_entry_rate();

revoke execute on function public.limit_entry_rate() from public, anon, authenticated;
