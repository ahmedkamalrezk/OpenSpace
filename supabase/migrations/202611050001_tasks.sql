-- Two-person workspace tasks with recipient-only completion and read receipts.
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 1000),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  assignee_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'open' check (status in ('open','completed')),
  read_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_not_self_assigned check (created_by <> assignee_id),
  constraint tasks_completion_timestamp check (
    (status = 'open' and completed_at is null) or
    (status = 'completed' and completed_at is not null)
  )
);
create index if not exists tasks_workspace_created_idx on public.tasks(workspace_id, created_at desc);
create index if not exists tasks_assignee_status_idx on public.tasks(assignee_id, status, created_at desc);

create or replace function public.set_task_timestamps()
returns trigger language plpgsql set search_path=public,pg_temp
as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.read_at := null;
    new.completed_at := null;
  else
    if new.workspace_id is distinct from old.workspace_id
      or new.created_by is distinct from old.created_by
      or new.assignee_id is distinct from old.assignee_id
      or new.title is distinct from old.title
      or new.description is distinct from old.description then
      raise exception 'Task details and assignment cannot be changed after creation.';
    end if;
    if old.status = 'completed' and new.status <> 'completed' then
      raise exception 'Completed tasks cannot be reopened.';
    end if;
    if old.read_at is not null and new.read_at is distinct from old.read_at then
      raise exception 'Task read receipts cannot be cleared.';
    end if;
    if new.status is distinct from old.status then
      new.completed_at := case when new.status = 'completed' then now() else null end;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists tasks_set_timestamps on public.tasks;
create trigger tasks_set_timestamps before insert or update on public.tasks
for each row execute function public.set_task_timestamps();

alter table public.tasks enable row level security;
drop policy if exists tasks_select_workspace_member on public.tasks;
create policy tasks_select_workspace_member on public.tasks
for select to authenticated using (public.is_workspace_member(workspace_id));
drop policy if exists tasks_insert_assign_to_member on public.tasks;
create policy tasks_insert_assign_to_member on public.tasks
for insert to authenticated with check (
  created_by = auth.uid()
  and assignee_id <> auth.uid()
  and status = 'open'
  and read_at is null
  and completed_at is null
  and public.is_workspace_member(workspace_id)
  and exists (
    select 1 from public.workspace_members member_row
    where member_row.workspace_id = tasks.workspace_id
      and member_row.user_id = tasks.assignee_id
  )
);
drop policy if exists tasks_update_assignee on public.tasks;
create policy tasks_update_assignee on public.tasks
for update to authenticated using (
  assignee_id = auth.uid() and public.is_workspace_member(workspace_id)
) with check (
  assignee_id = auth.uid() and public.is_workspace_member(workspace_id)
  and status in ('open','completed')
);

revoke all on table public.tasks from public, anon, authenticated;
grant select on public.tasks to authenticated;
grant insert (workspace_id, title, description, assignee_id) on public.tasks to authenticated;
grant update (status, read_at) on public.tasks to authenticated;
revoke all on function public.set_task_timestamps() from public, anon, authenticated;

do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;

notify pgrst, 'reload schema';
