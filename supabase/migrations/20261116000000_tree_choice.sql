-- Rooted: each member chooses which kind of tree they grow (oak, sakura, pine, ...).
-- Run after 20261115000000_rooted.sql (SQL Editor -> paste -> Run).

alter table public.profiles
  add column if not exists tree text check (tree ~ '^[a-z]{2,20}$');  -- null until they choose

drop policy if exists "Update own profile" on public.profiles;
create policy "Update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Members may change only their tree; points, admin flag and name stay server-controlled.
grant update (tree) on public.profiles to authenticated;
