-- Run once in the Supabase SQL editor after creating the owner's Auth user.
-- Replace OWNER_EMAIL_HERE with that account's email address.
do $$
declare
  owner_email text := 'OWNER_EMAIL_HERE';
  owner_user uuid;
  workspace uuid;
begin
  select id into owner_user from auth.users where email = owner_email;
  if owner_user is null then
    raise exception 'Create the owner account in Supabase Auth before running this script.';
  end if;
  if exists(select 1 from public.workspaces) then
    raise exception 'A workspace already exists; this bootstrap script is one-time only.';
  end if;
  insert into public.profiles(id, display_name)
  values(owner_user, split_part(owner_email, '@', 1))
  on conflict(id) do nothing;
  insert into public.workspaces(name, owner_id)
  values('Studio No. 01', owner_user)
  returning id into workspace;
  insert into public.workspace_members(workspace_id, user_id, role)
  values(workspace, owner_user, 'owner');
end $$;
