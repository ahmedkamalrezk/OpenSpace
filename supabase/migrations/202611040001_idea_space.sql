-- OPEN SPACE: private, two-person workspace schema
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Workspace member',
  avatar_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Studio No. 01',
  owner_id uuid not null references public.profiles(id) on delete restrict,
  selected_idea_id uuid,
  selection_note text not null default '',
  selected_by uuid references public.profiles(id) on delete set null,
  selected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','collaborator')),
  joined_at timestamptz not null default now(),
  unique(workspace_id,user_id)
);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 100),
  short_description text not null default '' check (char_length(short_description)<=240),
  description text not null default '',
  problem_statement text not null default '',
  proposed_solution text not null default '',
  category text not null default 'Other',
  technologies jsonb not null default '[]'::jsonb check (jsonb_typeof(technologies)='array'),
  expected_features jsonb not null default '[]'::jsonb check (jsonb_typeof(expected_features)='array'),
  visibility text not null default 'private' check (visibility in ('private','shared')),
  status text not null default 'idea' check (status in ('idea','discussion','selected','planned','in_progress','completed','on_hold','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ideas_workspace_created_idx on public.ideas(workspace_id,created_at desc);
create index if not exists ideas_workspace_status_idx on public.ideas(workspace_id,status);
create index if not exists ideas_search_idx on public.ideas using gin(to_tsvector('simple',coalesce(title,'')||' '||coalesce(short_description,'')||' '||coalesce(description,'')||' '||coalesce(category,'')));
alter table public.workspaces drop constraint if exists workspaces_selected_idea_fk;
alter table public.workspaces add constraint workspaces_selected_idea_fk foreign key(selected_idea_id) references public.ideas(id) on delete set null;

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists comments_idea_created_idx on public.comments(idea_id,created_at);
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  vote_type text not null default 'upvote' check (vote_type='upvote'),
  created_at timestamptz not null default now(),
  unique(idea_id,user_id)
);
create index if not exists votes_idea_idx on public.votes(idea_id);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  related_idea_id uuid references public.ideas(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 150),
  url text not null check (url ~* '^https?://'),
  description text not null default '',
  category text not null default 'Other',
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags)='array'),
  visibility text not null default 'private' check (visibility in ('private','shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists resources_workspace_created_idx on public.resources(workspace_id,created_at desc);
create index if not exists resources_search_idx on public.resources using gin(to_tsvector('simple',coalesce(title,'')||' '||coalesce(url,'')||' '||coalesce(description,'')));
create table if not exists public.resource_favorites (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(resource_id,user_id)
);
create index if not exists resource_favorites_user_idx on public.resource_favorites(user_id,created_at desc);
create table if not exists public.project_details (
  idea_id uuid primary key references public.ideas(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  start_date date,
  target_date date,
  notes text not null default '',
  github_url text check (github_url is null or github_url ~* '^https?://'),
  demo_url text check (demo_url is null or demo_url ~* '^https?://'),
  updated_at timestamptz not null default now()
);
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists invitations_one_open_per_workspace on public.invitations(workspace_id) where used_at is null and revoked_at is null;
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null check(entity_type in ('idea','comment','vote','resource','project')),
  entity_id uuid not null,
  entity_title text,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists activity_logs_workspace_created_idx on public.activity_logs(workspace_id,created_at desc);

create or replace function public.is_workspace_member(target_workspace uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.workspace_members where workspace_id=target_workspace and user_id=auth.uid()) $$;
create or replace function public.is_workspace_owner(target_workspace uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.workspace_members where workspace_id=target_workspace and user_id=auth.uid() and role='owner') $$;
create or replace function public.can_view_idea(target_idea uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.ideas i where i.id=target_idea and public.is_workspace_member(i.workspace_id) and (i.visibility='shared' or i.created_by=auth.uid())) $$;
create or replace function public.can_view_resource(target_resource uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$ select exists(select 1 from public.resources r where r.id=target_resource and public.is_workspace_member(r.workspace_id) and (r.visibility='shared' or r.created_by=auth.uid())) $$;
create or replace function public.can_access_profile(target_user uuid)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$ select target_user=auth.uid() or exists(select 1 from public.workspace_members a join public.workspace_members b on b.workspace_id=a.workspace_id where a.user_id=auth.uid() and b.user_id=target_user) $$;
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path=public,pg_temp
as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists ideas_touch_updated_at on public.ideas;
create trigger ideas_touch_updated_at before update on public.ideas for each row execute function public.touch_updated_at();
drop trigger if exists comments_touch_updated_at on public.comments;
create trigger comments_touch_updated_at before update on public.comments for each row execute function public.touch_updated_at();
drop trigger if exists resources_touch_updated_at on public.resources;
create trigger resources_touch_updated_at before update on public.resources for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$ begin
  insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),split_part(new.email,'@',1),'Workspace member')) on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Workspace membership is provisioned by the owner bootstrap script or an invitation.
create or replace function public.ensure_workspace()
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$
declare uid uuid:=auth.uid(); ws uuid;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  insert into public.profiles(id) values(uid) on conflict(id) do nothing;
  select workspace_id into ws from public.workspace_members where user_id=uid order by joined_at limit 1;
  if ws is null then raise exception 'This account is not a workspace member. Join through a valid invitation link.'; end if;
  return ws;
end $$;

create or replace function public.create_invitation(p_expires_in_days integer default 7)
returns text language plpgsql security definer set search_path=public,pg_temp
as $$
declare ws uuid; token text;
begin
  select workspace_id into ws from public.workspace_members where user_id=auth.uid() and role='owner' limit 1;
  if ws is null then raise exception 'Only the workspace owner can invite a collaborator.'; end if;
  perform 1 from public.workspaces where id=ws for update;
  if (select count(*) from public.workspace_members where workspace_id=ws)>=2 then raise exception 'This workspace already has two members.'; end if;
  if (select count(*) from public.invitations where workspace_id=ws and created_by=auth.uid() and created_at>now()-interval '1 hour')>=5 then raise exception 'Invitation limit reached. Try again later.'; end if;
  update public.invitations set revoked_at=now() where workspace_id=ws and used_at is null and revoked_at is null;
  token:=encode(extensions.gen_random_bytes(32),'hex');
  insert into public.invitations(workspace_id,token_hash,created_by,expires_at)
  values(ws,encode(extensions.digest(token,'sha256'),'hex'),auth.uid(),now()+make_interval(days=>greatest(1,least(p_expires_in_days,30))));
  return token;
end $$;
create or replace function public.revoke_invitation(p_invitation_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp
as $$ begin
  update public.invitations i set revoked_at=now() where i.id=p_invitation_id and i.used_at is null and i.revoked_at is null and public.is_workspace_owner(i.workspace_id);
  if not found then raise exception 'Invitation not found or cannot be revoked.'; end if;
end $$;
create or replace function public.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$
declare inv public.invitations%rowtype; member_count integer; uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Sign in before accepting an invitation.'; end if;
  if p_token is null or length(p_token)<32 then raise exception 'Invalid invitation.'; end if;
  insert into public.profiles(id) values(uid) on conflict(id) do nothing;
  select * into inv from public.invitations where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
  if not found or inv.revoked_at is not null or inv.used_at is not null or inv.expires_at<=now() then raise exception 'This invitation is invalid, expired, or already used.'; end if;
  perform 1 from public.workspaces where id=inv.workspace_id for update;
  if exists(select 1 from public.workspace_members where user_id=uid) then raise exception 'This account is already linked to a workspace.'; end if;
  select count(*) into member_count from public.workspace_members where workspace_id=inv.workspace_id;
  if member_count>=2 then raise exception 'This workspace is full.'; end if;
  insert into public.workspace_members(workspace_id,user_id,role) values(inv.workspace_id,uid,'collaborator');
  update public.invitations set used_at=now() where id=inv.id;
  return inv.workspace_id;
end $$;

create or replace function public.set_next_project(p_idea_id uuid,p_note text default '')
returns void language plpgsql security definer set search_path=public,pg_temp
as $$
declare ws uuid; old_idea uuid;
begin
  select workspace_id into ws from public.workspace_members where user_id=auth.uid() limit 1;
  if ws is null then raise exception 'Workspace membership required.'; end if;
  perform 1 from public.workspaces where id=ws for update;
  select selected_idea_id into old_idea from public.workspaces where id=ws;
  if p_idea_id is not null and not exists(select 1 from public.ideas where id=p_idea_id and workspace_id=ws and visibility='shared') then raise exception 'Only a shared idea in this workspace can be selected.'; end if;
  if old_idea is not null and old_idea<>p_idea_id then update public.ideas set status='idea' where id=old_idea and status='selected'; end if;
  if p_idea_id is not null then update public.ideas set status='selected' where id=p_idea_id; end if;
  update public.workspaces set selected_idea_id=p_idea_id,selection_note=coalesce(p_note,''),selected_by=case when p_idea_id is distinct from old_idea then auth.uid() else selected_by end,selected_at=case when p_idea_id is null then null when p_idea_id is distinct from old_idea then now() else selected_at end where id=ws;
end $$;

create or replace function public.validate_comment_parent()
returns trigger language plpgsql set search_path=public,pg_temp
as $$ begin
  if new.parent_id is not null and not exists(select 1 from public.comments p where p.id=new.parent_id and p.idea_id=new.idea_id) then raise exception 'Reply must belong to the same idea discussion.'; end if;
  return new;
end $$;
drop trigger if exists comments_parent_guard on public.comments;
create trigger comments_parent_guard before insert or update of idea_id,parent_id on public.comments for each row execute function public.validate_comment_parent();
create or replace function public.validate_resource_link()
returns trigger language plpgsql set search_path=public,pg_temp
as $$ begin
  if new.related_idea_id is not null and not exists(select 1 from public.ideas i where i.id=new.related_idea_id and i.workspace_id=new.workspace_id and (new.visibility<>'shared' or i.visibility='shared')) then raise exception 'Related idea must be in this workspace and visible to this resource audience.'; end if;
  return new;
end $$;
drop trigger if exists resources_related_idea_guard on public.resources;
create trigger resources_related_idea_guard before insert or update of workspace_id,visibility,related_idea_id on public.resources for each row execute function public.validate_resource_link();

create or replace function public.clear_private_idea_references()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$ begin
  if old.visibility='shared' and new.visibility='private' then
    update public.workspaces set selected_idea_id=case when selected_idea_id=new.id then null else selected_idea_id end,selection_note=case when selected_idea_id=new.id then '' else selection_note end,selected_by=case when selected_idea_id=new.id then null else selected_by end,selected_at=case when selected_idea_id=new.id then null else selected_at end,updated_at=now() where id=new.workspace_id;
    update public.ideas set status='idea' where id=new.id and status='selected';
    update public.resources set related_idea_id=null,updated_at=now() where related_idea_id=new.id and visibility='shared';
  end if;
  return new;
end $$;
drop trigger if exists ideas_private_cleanup on public.ideas;
create trigger ideas_private_cleanup after update of visibility on public.ideas for each row when(old.visibility='shared' and new.visibility='private') execute function public.clear_private_idea_references();

create or replace function public.log_entity_activity()
returns trigger language plpgsql security definer set search_path=public,pg_temp
as $$
declare ws uuid; item_id uuid; title text; actor uuid; kind text; verb text;
begin
  if tg_table_name='ideas' then
    ws:=new.workspace_id; item_id:=new.id; title:=new.title; actor:=auth.uid(); kind:='idea'; verb:=case when tg_op='INSERT' then 'created an idea' else 'updated an idea' end;
  elsif tg_table_name='resources' then
    ws:=new.workspace_id; item_id:=new.id; title:=new.title; actor:=auth.uid(); kind:='resource'; verb:=case when tg_op='INSERT' then 'saved a resource' else 'updated a resource' end;
  elsif tg_table_name='comments' then
    select workspace_id,title into ws,title from public.ideas where id=new.idea_id; item_id:=new.idea_id; actor:=new.user_id; kind:='idea'; verb:=case when new.parent_id is null then 'commented on' else 'replied to' end;
  else
    select workspace_id,title into ws,title from public.ideas where id=new.idea_id; item_id:=new.idea_id; actor:=new.user_id; kind:='idea'; verb:='voted for';
  end if;
  insert into public.activity_logs(workspace_id,user_id,entity_type,entity_id,entity_title,action) values(ws,actor,kind,item_id,title,verb);
  return new;
end $$;
drop trigger if exists ideas_activity_log on public.ideas;
create trigger ideas_activity_log after insert or update on public.ideas for each row execute function public.log_entity_activity();
drop trigger if exists comments_activity_log on public.comments;
create trigger comments_activity_log after insert on public.comments for each row execute function public.log_entity_activity();
drop trigger if exists votes_activity_log on public.votes;
create trigger votes_activity_log after insert on public.votes for each row execute function public.log_entity_activity();
drop trigger if exists resources_activity_log on public.resources;
create trigger resources_activity_log after insert or update on public.resources for each row execute function public.log_entity_activity();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.ideas enable row level security;
alter table public.comments enable row level security;
alter table public.votes enable row level security;
alter table public.resources enable row level security;
alter table public.resource_favorites enable row level security;
alter table public.project_details enable row level security;
alter table public.invitations enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists profiles_select_workspace on public.profiles;
create policy profiles_select_workspace on public.profiles for select to authenticated using(public.can_access_profile(id));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists workspaces_select_member on public.workspaces;
create policy workspaces_select_member on public.workspaces for select to authenticated using(public.is_workspace_member(id));
drop policy if exists workspaces_update_owner on public.workspaces;
create policy workspaces_update_owner on public.workspaces for update to authenticated using(public.is_workspace_owner(id)) with check(public.is_workspace_owner(id));
drop policy if exists workspace_members_select_member on public.workspace_members;
create policy workspace_members_select_member on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));

drop policy if exists ideas_select_visible on public.ideas;
create policy ideas_select_visible on public.ideas for select to authenticated using(public.is_workspace_member(workspace_id) and (visibility='shared' or created_by=auth.uid()));
drop policy if exists ideas_insert_self on public.ideas;
create policy ideas_insert_self on public.ideas for insert to authenticated with check(created_by=auth.uid() and public.is_workspace_member(workspace_id));
drop policy if exists ideas_update_owner on public.ideas;
create policy ideas_update_owner on public.ideas for update to authenticated using(created_by=auth.uid() and public.is_workspace_member(workspace_id)) with check(created_by=auth.uid() and public.is_workspace_member(workspace_id) and (status<>'selected' or exists(select 1 from public.workspaces w where w.id=ideas.workspace_id and w.selected_idea_id=ideas.id)));
drop policy if exists ideas_delete_owner on public.ideas;
create policy ideas_delete_owner on public.ideas for delete to authenticated using(created_by=auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists comments_select_idea on public.comments;
create policy comments_select_idea on public.comments for select to authenticated using(public.can_view_idea(idea_id));
drop policy if exists comments_insert_shared on public.comments;
create policy comments_insert_shared on public.comments for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.ideas i where i.id=idea_id and i.visibility='shared' and public.is_workspace_member(i.workspace_id)));
drop policy if exists comments_update_owner on public.comments;
create policy comments_update_owner on public.comments for update to authenticated using(user_id=auth.uid() and public.can_view_idea(idea_id)) with check(user_id=auth.uid() and public.can_view_idea(idea_id));
drop policy if exists comments_delete_owner on public.comments;
create policy comments_delete_owner on public.comments for delete to authenticated using(user_id=auth.uid() and public.can_view_idea(idea_id));

drop policy if exists votes_select_shared on public.votes;
create policy votes_select_shared on public.votes for select to authenticated using(exists(select 1 from public.ideas i where i.id=idea_id and i.visibility='shared' and public.is_workspace_member(i.workspace_id)));
drop policy if exists votes_insert_shared on public.votes;
create policy votes_insert_shared on public.votes for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.ideas i where i.id=idea_id and i.visibility='shared' and public.is_workspace_member(i.workspace_id)));
drop policy if exists votes_delete_self on public.votes;
create policy votes_delete_self on public.votes for delete to authenticated using(user_id=auth.uid() and exists(select 1 from public.ideas i where i.id=idea_id and i.visibility='shared' and public.is_workspace_member(i.workspace_id)));

drop policy if exists resources_select_visible on public.resources;
create policy resources_select_visible on public.resources for select to authenticated using(public.is_workspace_member(workspace_id) and (visibility='shared' or created_by=auth.uid()));
drop policy if exists resources_insert_self on public.resources;
create policy resources_insert_self on public.resources for insert to authenticated with check(created_by=auth.uid() and public.is_workspace_member(workspace_id));
drop policy if exists resources_update_owner on public.resources;
create policy resources_update_owner on public.resources for update to authenticated using(created_by=auth.uid() and public.is_workspace_member(workspace_id)) with check(created_by=auth.uid() and public.is_workspace_member(workspace_id));
drop policy if exists resources_delete_owner on public.resources;
create policy resources_delete_owner on public.resources for delete to authenticated using(created_by=auth.uid() and public.is_workspace_member(workspace_id));

drop policy if exists favorites_select_self on public.resource_favorites;
create policy favorites_select_self on public.resource_favorites for select to authenticated using(user_id=auth.uid() and public.can_view_resource(resource_id));
drop policy if exists favorites_insert_self on public.resource_favorites;
create policy favorites_insert_self on public.resource_favorites for insert to authenticated with check(user_id=auth.uid() and public.can_view_resource(resource_id));
drop policy if exists favorites_delete_self on public.resource_favorites;
create policy favorites_delete_self on public.resource_favorites for delete to authenticated using(user_id=auth.uid() and public.can_view_resource(resource_id));

drop policy if exists project_details_select_visible on public.project_details;
create policy project_details_select_visible on public.project_details for select to authenticated using(public.can_view_idea(idea_id));
drop policy if exists project_details_insert_owner on public.project_details;
create policy project_details_insert_owner on public.project_details for insert to authenticated with check(exists(select 1 from public.ideas i where i.id=idea_id and i.workspace_id=project_details.workspace_id and i.created_by=auth.uid() and public.is_workspace_member(i.workspace_id)));
drop policy if exists project_details_update_owner on public.project_details;
create policy project_details_update_owner on public.project_details for update to authenticated using(exists(select 1 from public.ideas i where i.id=idea_id and i.created_by=auth.uid() and public.is_workspace_member(i.workspace_id))) with check(exists(select 1 from public.ideas i where i.id=idea_id and i.workspace_id=project_details.workspace_id and i.created_by=auth.uid() and public.is_workspace_member(i.workspace_id)));
drop policy if exists project_details_delete_owner on public.project_details;
create policy project_details_delete_owner on public.project_details for delete to authenticated using(exists(select 1 from public.ideas i where i.id=idea_id and i.created_by=auth.uid() and public.is_workspace_member(i.workspace_id)));

drop policy if exists invitations_select_owner on public.invitations;
create policy invitations_select_owner on public.invitations for select to authenticated using(public.is_workspace_owner(workspace_id));
drop policy if exists activity_select_authorized_entity on public.activity_logs;
create policy activity_select_authorized_entity on public.activity_logs for select to authenticated using(public.is_workspace_member(workspace_id) and ((entity_type in ('idea','comment','vote','project') and public.can_view_idea(entity_id)) or (entity_type='resource' and public.can_view_resource(entity_id))));

revoke all on table public.profiles, public.workspaces, public.workspace_members, public.ideas, public.comments, public.votes, public.resources, public.resource_favorites, public.project_details, public.invitations, public.activity_logs from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name,avatar_url) on public.profiles to authenticated;
grant select on public.workspaces to authenticated;
grant update(name) on public.workspaces to authenticated;
grant select on public.workspace_members to authenticated;
grant select,insert,update,delete on public.ideas to authenticated;
grant select,insert,update,delete on public.comments to authenticated;
grant select,insert,delete on public.votes to authenticated;
grant select,insert,update,delete on public.resources to authenticated;
grant select,insert,delete on public.resource_favorites to authenticated;
grant select,insert,update,delete on public.project_details to authenticated;
grant select on public.invitations to authenticated;
grant select on public.activity_logs to authenticated;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_owner(uuid) from public;
revoke all on function public.can_view_idea(uuid) from public;
revoke all on function public.can_view_resource(uuid) from public;
revoke all on function public.can_access_profile(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_owner(uuid) to authenticated;
grant execute on function public.can_view_idea(uuid) to authenticated;
grant execute on function public.can_view_resource(uuid) to authenticated;
grant execute on function public.can_access_profile(uuid) to authenticated;
revoke all on function public.ensure_workspace() from public, anon;
revoke all on function public.create_invitation(integer) from public, anon;
revoke all on function public.revoke_invitation(uuid) from public, anon;
revoke all on function public.accept_invitation(text) from public, anon;
revoke all on function public.set_next_project(uuid,text) from public, anon;
grant execute on function public.ensure_workspace() to authenticated;
grant execute on function public.create_invitation(integer) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.set_next_project(uuid,text) to authenticated;

-- Realtime database changes remain subject to the RLS policies above.
do $$
declare t text;
begin
  foreach t in array array['ideas','comments','votes','resources','workspaces','project_details','activity_logs'] loop
    if exists(select 1 from pg_publication where pubname='supabase_realtime')
      and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;

