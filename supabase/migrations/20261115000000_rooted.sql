-- Rooted: accounts, private notes, public tree progress, and an admin user list.
-- Run once in Supabase (SQL Editor -> paste -> Run).

-- ---------- profiles: one per account, visible to every signed-in member ----------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 40),
  is_admin      boolean not null default false,
  points        integer not null default 0,
  entry_count   integer not null default 0,
  last_entry_at timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------- entries: the diary. Only the owner can ever read these. ----------
create table if not exists public.entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  subject    text not null check (char_length(subject) between 1 and 200),
  note       text not null default '' check (char_length(note) <= 20000),
  points     integer not null check (points between 0 and 60),
  tags       text[] not null default '{}',
  created_at timestamptz not null default now()   -- date and time recorded automatically
);

create index if not exists entries_user_created_idx on public.entries (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.entries enable row level security;

drop policy if exists "Members see profiles" on public.profiles;
create policy "Members see profiles" on public.profiles
  for select to authenticated using (true);

drop policy if exists "Read own entries" on public.entries;
create policy "Read own entries" on public.entries
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Insert own entries" on public.entries;
create policy "Insert own entries" on public.entries
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Delete own entries" on public.entries;
create policy "Delete own entries" on public.entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Clients may only send the note itself; owner and timestamp always come from the server.
revoke all on public.profiles, public.entries from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, delete on public.entries to authenticated;
grant insert (subject, note, points, tags) on public.entries to authenticated;

-- ---------- new account -> profile. The very first account becomes the admin. ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, is_admin)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 40),
    not exists (select 1 from public.profiles)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- keep each profile's totals in step with its notes ----------
create or replace function public.refresh_profile_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := coalesce(new.user_id, old.user_id);
begin
  update public.profiles p
  set points        = coalesce((select sum(e.points) from public.entries e where e.user_id = uid), 0),
      entry_count   = (select count(*) from public.entries e where e.user_id = uid),
      last_entry_at = (select max(e.created_at) from public.entries e where e.user_id = uid)
  where p.id = uid;
  return null;
end;
$$;

drop trigger if exists entries_refresh_totals on public.entries;
create trigger entries_refresh_totals
  after insert or delete on public.entries
  for each row execute function public.refresh_profile_totals();

-- ---------- a friend's progress squares: counts per day, never the notes ----------
create or replace function public.activity_days(target uuid, tz text default 'UTC')
returns table (day text, count integer, points integer)
language sql
stable
security definer
set search_path = ''
as $$
  select to_char((e.created_at at time zone tz)::date, 'YYYY-MM-DD'),
         count(*)::integer,
         sum(e.points)::integer
  from public.entries e
  where e.user_id = target
    and e.created_at > now() - interval '380 days'
  group by 1;
$$;

-- ---------- admin: list every user with email ----------
create or replace function public.admin_list_users()
returns table (
  id uuid, display_name text, email text, is_admin boolean,
  points integer, entry_count integer, last_entry_at timestamptz, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin) then
    raise exception 'Admins only';
  end if;
  return query
    select p.id, p.display_name, u.email::text, p.is_admin, p.points, p.entry_count, p.last_entry_at, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at;
end;
$$;

revoke execute on function public.activity_days(uuid, text), public.admin_list_users() from public, anon;
grant execute on function public.activity_days(uuid, text), public.admin_list_users() to authenticated;
revoke execute on function public.handle_new_user(), public.refresh_profile_totals() from public, anon, authenticated;
