-- StoryForge migration 002: branches, savepoints, character enhancements
set search_path = public, extensions;

-- ── branches ──────────────────────────────────────────────────────────────────
-- Each project can have multiple named branches (like git branches).
-- The "main" branch is created automatically when a project is created.
create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null default 'main',
  description text not null default '',
  is_active   boolean not null default false,
  root_scene_id uuid references public.scenes(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists branches_project_id_idx on public.branches(project_id);

alter table public.branches enable row level security;
create policy "Users own their branches"
  on public.branches for all
  using (
    exists (select 1 from public.projects p where p.id = branches.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = branches.project_id and p.user_id = auth.uid())
  );

-- ── savepoints ────────────────────────────────────────────────────────────────
-- Named bookmarks at a specific scene within a branch.
create table if not exists public.savepoints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  branch_id   uuid references public.branches(id) on delete cascade,
  scene_id    uuid not null references public.scenes(id) on delete cascade,
  name        text not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists savepoints_project_id_idx on public.savepoints(project_id);
create index if not exists savepoints_branch_id_idx  on public.savepoints(branch_id);

alter table public.savepoints enable row level security;
create policy "Users own their savepoints"
  on public.savepoints for all
  using (
    exists (select 1 from public.projects p where p.id = savepoints.project_id and p.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = savepoints.project_id and p.user_id = auth.uid())
  );

-- ── scenes: add branch_id ──────────────────────────────────────────────────────
alter table public.scenes add column if not exists branch_id uuid references public.branches(id) on delete set null;
create index if not exists scenes_branch_id_idx on public.scenes(branch_id);

-- ── characters: add biography + relations JSONB columns ───────────────────────
alter table public.characters add column if not exists biography     text not null default '';
alter table public.characters add column if not exists custom_fields jsonb not null default '{}';
alter table public.characters add column if not exists relations     jsonb not null default '[]';
