-- Lets the leader hand the group to another member. Run once in the Supabase SQL editor if the
-- project already ran schema.sql before this existed (schema.sql has the same function).
--
-- The "leader updates sessions" policy cannot do this: its WITH CHECK requires the row to still be
-- led by the caller afterwards. A SECURITY DEFINER function checks the rules itself instead.

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
