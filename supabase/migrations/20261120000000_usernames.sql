-- Rooted: members sign in with a username; only the admin signs in with an email.
--
-- Supabase accounts need an email, so a username account gets a stand-in address,
-- <username>@rooted.invalid (the .invalid domain can never receive mail). The app makes
-- that address from the username; nobody types or sees it.
-- Older accounts that signed up with an email pick a username once after signing in
-- (supabase/functions/account does the switch). Their old email is kept where only the
-- admin can see it.
--
-- Forgotten passwords: the recovery key resets them. `reset_checks` holds a hash of a value
-- made from each person's recovery key (never the key), which the account function compares.
--
-- Run after the earlier migrations (SQL Editor -> paste -> Run). Safe to run twice.
-- Then deploy supabase/functions/account (see README).

-- ---------- usernames ----------
alter table public.profiles
  add column if not exists username text unique check (username ~ '^[a-z0-9_]{3,20}$');
-- members can read it like the rest of the profile (grant select on profiles already covers it)

-- New accounts: a username account's profile gets its username from the stand-in email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, is_admin, username)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 40),
    not exists (select 1 from public.profiles),
    case when new.email like '%@rooted.invalid' then split_part(new.email, '@', 1) end
  );
  return new;
end;
$$;

-- ---------- older accounts switching to a username ----------
-- Only the admin can read these (through admin_list_users).
create table if not exists public.former_emails (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  email      text not null,
  changed_at timestamptz not null default now()
);
alter table public.former_emails enable row level security;
revoke all on public.former_emails from anon, authenticated;

-- When an account's email becomes a username stand-in: keep the old email and set the username.
create or replace function public.handle_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email like '%@rooted.invalid' and new.email is distinct from old.email then
    if old.email is not null and old.email not like '%@rooted.invalid' then
      insert into public.former_emails (user_id, email) values (new.id, old.email)
      on conflict (user_id) do nothing;
    end if;
    update public.profiles set username = split_part(new.email, '@', 1) where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_email_change();

-- ---------- password reset with the recovery key ----------
create table if not exists public.reset_checks (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  check_hash text not null check (check_hash ~ '^[0-9a-f]{64}$'),
  updated_at timestamptz not null default now()
);
alter table public.reset_checks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reset_checks' and policyname = 'Read own reset check') then
    create policy "Read own reset check" on public.reset_checks
      for select to authenticated using ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reset_checks' and policyname = 'Create own reset check') then
    create policy "Create own reset check" on public.reset_checks
      for insert to authenticated with check ((select auth.uid()) = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reset_checks' and policyname = 'Change own reset check') then
    create policy "Change own reset check" on public.reset_checks
      for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
  end if;
end;
$$;

revoke all on public.reset_checks from anon, authenticated;
grant select on public.reset_checks to authenticated;
-- (an upsert also writes user_id on update; the policy keeps it the person's own)
grant insert (user_id, check_hash, updated_at), update (user_id, check_hash, updated_at) on public.reset_checks to authenticated;

-- Failed reset attempts, so nobody can keep guessing (the account function counts these).
create table if not exists public.reset_attempts (
  id       bigint generated always as identity primary key,
  username text not null,
  at       timestamptz not null default now()
);
create index if not exists reset_attempts_username_at_idx on public.reset_attempts (username, at desc);
alter table public.reset_attempts enable row level security;
revoke all on public.reset_attempts from anon, authenticated;

-- ---------- admin: the user list shows usernames, and emails only where they exist ----------
drop function if exists public.admin_list_users();
create function public.admin_list_users()
returns table (
  id uuid, display_name text, username text, email text, is_admin boolean,
  points integer, entry_count integer, last_entry_at timestamptz, created_at timestamptz, tree text
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
    select p.id, p.display_name, p.username,
           case when u.email like '%@rooted.invalid' then f.email else u.email::text end,
           p.is_admin, p.points, p.entry_count, p.last_entry_at, p.created_at, p.tree
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.former_emails f on f.user_id = p.id
    order by p.created_at;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
revoke execute on function public.handle_new_user(), public.handle_email_change() from public, anon, authenticated;

notify pgrst, 'reload schema';
