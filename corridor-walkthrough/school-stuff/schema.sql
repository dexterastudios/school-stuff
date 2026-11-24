-- =========================================================
-- Meridian MUN — Supabase schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)
-- =========================================================

-- ---------------------------------------------------------
-- 1. profiles
-- One row per authenticated user, created automatically on signup.
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'member' check (role in ('member', 'admin')),
  committee   text,
  country     text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ---------------------------------------------------------
-- 2. is_admin() helper
-- security definer function so RLS policies can check role without
-- causing recursive-policy errors on the profiles table itself.
-- ---------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------
-- 3. profiles policies
-- ---------------------------------------------------------
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_admin_update_any" on public.profiles;
create policy "profiles_admin_update_any"
  on public.profiles for update
  using (public.is_admin());

-- ---------------------------------------------------------
-- 4. auto-create a profile row whenever a new user signs up
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'member'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- 5. members (public secretariat roster shown on the website)
-- ---------------------------------------------------------
create table if not exists public.members (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  role_title   text not null,
  committee    text,
  bio          text,
  photo_index  integer,           -- maps to /member{photo_index}.png in the site root
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.members enable row level security;

drop policy if exists "members_public_read" on public.members;
create policy "members_public_read"
  on public.members for select
  using (true);

drop policy if exists "members_admin_insert" on public.members;
create policy "members_admin_insert"
  on public.members for insert
  with check (public.is_admin());

drop policy if exists "members_admin_update" on public.members;
create policy "members_admin_update"
  on public.members for update
  using (public.is_admin());

drop policy if exists "members_admin_delete" on public.members;
create policy "members_admin_delete"
  on public.members for delete
  using (public.is_admin());

-- ---------------------------------------------------------
-- 6. seed data (optional — remove or edit freely)
-- photo_index 1 and 2 will look for /member1.png and /member2.png;
-- the rest have no photo_index, so the site shows the orange
-- initials fallback automatically.
-- ---------------------------------------------------------
insert into public.members (name, role_title, committee, photo_index, sort_order) values
  ('Amara Osei',       'Secretary-General',            null,      1, 1),
  ('Diego Marín',      'Director-General',              null,      2, 2),
  ('Priya Nair',       'USG — Committees',              'UNSC',    null, 3),
  ('Felix Novak',      'USG — Delegate Affairs',        null,      null, 4),
  ('Sena Adjei',       'Chef de Cabinet',                null,      null, 5),
  ('Louis Chevalier',  'Director — Press Corps',        'PRESS',   null, 6)
on conflict do nothing;

-- ---------------------------------------------------------
-- 7. making your first admin
-- After you sign up through the site with your own account, promote
-- yourself to admin by running (replace with your email):
--
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- ---------------------------------------------------------
