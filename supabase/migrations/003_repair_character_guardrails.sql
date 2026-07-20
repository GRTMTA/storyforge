create table if not exists public.character_guardrails (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  rule text not null,
  created_at timestamptz not null default now()
);

create index if not exists character_guardrails_project_id_idx
  on public.character_guardrails (project_id);
create index if not exists character_guardrails_character_id_idx
  on public.character_guardrails (character_id);

alter table public.character_guardrails enable row level security;

drop policy if exists "Users own their character guardrails"
  on public.character_guardrails;
create policy "Users own their character guardrails"
  on public.character_guardrails
  for all
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = character_guardrails.project_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = character_guardrails.project_id
        and p.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete
  on table public.character_guardrails to authenticated;
grant all privileges
  on table public.character_guardrails to service_role;

notify pgrst, 'reload schema';
