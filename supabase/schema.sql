-- Glidy schema. Run once in the Supabase SQL editor (or as a migration).
--
-- After running it, in the dashboard:
--   * Realtime -> Settings: turn OFF "Allow public access" so only the private-channel
--     policies below apply to live location broadcasts.
--   * Authentication -> Providers -> Email: for local development you may want to turn OFF
--     "Confirm email", otherwise sign-up asks the user to confirm before logging in.

-- ---------------------------------------------------------------- tables

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Profile picture (an emoji on a colour, or a ~192 px JPEG as a data URI). Added after the first
-- release: see migrations/001_profile_avatar.sql for projects that already ran this file.
alter table public.profiles
  add column if not exists avatar jsonb
  check (avatar is null or pg_column_size(avatar) < 60000);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  leader_id uuid not null references public.profiles (id) on delete cascade,
  destination jsonb,
  route jsonb,
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now()
);

create table if not exists public.session_members (
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.saved_routes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  origin jsonb,
  destination jsonb not null,
  route jsonb not null,
  is_shared boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists session_members_user_idx on public.session_members (user_id);
create index if not exists saved_routes_owner_idx on public.saved_routes (owner_id);

-- ---------------------------------------------------------------- helpers
-- SECURITY DEFINER so policies can check membership without recursing into RLS.

create or replace function public.is_session_member(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.session_members
    where session_id = sid and user_id = (select auth.uid())
  );
$$;

create or replace function public.shares_session_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.session_members mine
    join public.session_members theirs on theirs.session_id = mine.session_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = other
  );
$$;

-- Joins an active session by its code. Non-members cannot read `sessions`, so this
-- runs with elevated rights and only ever adds the caller.
create or replace function public.join_session(p_code text)
returns setof public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sessions;
begin
  select * into s from public.sessions
  where code = upper(trim(p_code)) and status = 'active';
  if not found then
    return;
  end if;
  insert into public.session_members (session_id, user_id)
  values (s.id, (select auth.uid()))
  on conflict do nothing;
  return next s;
end;
$$;

-- Hands the group to another member (the leader's own UPDATE policy cannot change leader_id).
create or replace function public.transfer_leadership(p_session uuid, p_user uuid)
returns setof public.sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sessions;
begin
  select * into s from public.sessions where id = p_session and status = 'active';
  if not found then
    raise exception 'session not found';
  end if;
  if s.leader_id <> (select auth.uid()) then
    raise exception 'only the leader can hand over the group';
  end if;
  if not exists (
    select 1 from public.session_members where session_id = p_session and user_id = p_user
  ) then
    raise exception 'that person is not in the group';
  end if;
  update public.sessions set leader_id = p_user where id = p_session returning * into s;
  return next s;
end;
$$;

revoke all on function public.transfer_leadership(uuid, uuid) from public, anon;
grant execute on function public.transfer_leadership(uuid, uuid) to authenticated;

-- The leader is automatically a member of their own session.
create or replace function public.add_leader_as_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.session_members (session_id, user_id) values (new.id, new.leader_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists sessions_add_leader on public.sessions;
create trigger sessions_add_leader
after insert on public.sessions
for each row execute function public.add_leader_as_member();

-- Creates the profile row when a user signs up, using the display name from sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'Traveller')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- row level security

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.saved_routes enable row level security;

-- profiles: your own, plus people you share a session with
create policy "read own or co-member profiles" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_session_with(id));
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- sessions: members read, only the leader writes
create policy "members read sessions" on public.sessions
  for select to authenticated
  using (leader_id = (select auth.uid()) or public.is_session_member(id));
create policy "leader creates sessions" on public.sessions
  for insert to authenticated
  with check (leader_id = (select auth.uid()));
create policy "leader updates sessions" on public.sessions
  for update to authenticated
  using (leader_id = (select auth.uid())) with check (leader_id = (select auth.uid()));
create policy "leader deletes sessions" on public.sessions
  for delete to authenticated
  using (leader_id = (select auth.uid()));

-- session_members: members see each other, anyone can leave; joining goes through join_session()
create policy "members read members" on public.session_members
  for select to authenticated
  using (public.is_session_member(session_id));
create policy "leave a session" on public.session_members
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- saved_routes: owner full access; anyone signed in can read routes the owner has shared
create policy "read own or shared routes" on public.saved_routes
  for select to authenticated
  using (owner_id = (select auth.uid()) or is_shared);
create policy "insert own routes" on public.saved_routes
  for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "update own routes" on public.saved_routes
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own routes" on public.saved_routes
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------- realtime (private broadcast channels)
-- Live locations are broadcast on the topic "session:<session id>" and never stored.
-- Only members of that session may subscribe or send. RLS is already enabled on
-- realtime.messages by Supabase, so it is not enabled here.

create policy "session members receive broadcasts" on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and (select realtime.topic()) like 'session:%'
    and public.is_session_member(split_part((select realtime.topic()), ':', 2)::uuid)
  );

create policy "session members send broadcasts" on realtime.messages
  for insert to authenticated
  with check (
    extension = 'broadcast'
    and (select realtime.topic()) like 'session:%'
    and public.is_session_member(split_part((select realtime.topic()), ':', 2)::uuid)
  );
