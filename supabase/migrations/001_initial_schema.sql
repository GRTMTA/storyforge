-- StoryForge Database Schema
-- Run in the Supabase SQL editor (or as a migration)

-- Enable required extensions
create extension if not exists "pgvector";
create extension if not exists "uuid-ossp";

-- ── projects ─────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  genre       text not null default 'Fantasy',
  setting     text not null default '',
  tone        text not null default 'Epic',
  guardrails  text[] not null default '{}',
  status      text not null default 'active' check (status in ('setup','active','completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.projects enable row level security;
create policy "Users own their projects"
  on public.projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── characters ────────────────────────────────────────────────────────────────
create table if not exists public.characters (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  name          text not null,
  role          text not null default 'supporting' check (role in ('protagonist','antagonist','supporting')),
  description   text not null default '',
  traits        text[] not null default '{}',
  backstory     text not null default '',
  current_state jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

alter table public.characters enable row level security;
create policy "Users own their characters"
  on public.characters for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = characters.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = characters.project_id and p.user_id = auth.uid()
    )
  );

-- ── scenes ────────────────────────────────────────────────────────────────────
create table if not exists public.scenes (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  parent_scene_id uuid references public.scenes(id) on delete set null,
  title           text not null,
  content         text not null,
  choice_made     text,
  scene_order     int not null default 0,
  depth           int not null default 0,
  is_ending       boolean not null default false,
  metadata        jsonb not null default '{}',
  embedding       vector(1536),
  created_at      timestamptz not null default now()
);

create index if not exists scenes_project_id_idx on public.scenes(project_id);
create index if not exists scenes_embedding_idx on public.scenes using ivfflat (embedding vector_cosine_ops);

alter table public.scenes enable row level security;
create policy "Users own their scenes"
  on public.scenes for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = scenes.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = scenes.project_id and p.user_id = auth.uid()
    )
  );

-- ── choices ───────────────────────────────────────────────────────────────────
create table if not exists public.choices (
  id                  uuid primary key default uuid_generate_v4(),
  scene_id            uuid not null references public.scenes(id) on delete cascade,
  label               text not null,
  description         text not null default '',
  consequence_hint    text not null default '',
  leads_to_scene_id   uuid references public.scenes(id) on delete set null,
  created_at          timestamptz not null default now()
);

alter table public.choices enable row level security;
create policy "Users own their choices"
  on public.choices for all
  using (
    exists (
      select 1 from public.scenes s
      join public.projects p on p.id = s.project_id
      where s.id = choices.scene_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenes s
      join public.projects p on p.id = s.project_id
      where s.id = choices.scene_id and p.user_id = auth.uid()
    )
  );

-- ── story_state ───────────────────────────────────────────────────────────────
create table if not exists public.story_state (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null unique references public.projects(id) on delete cascade,
  current_scene_id  uuid not null references public.scenes(id) on delete restrict,
  plot_threads      jsonb not null default '{}',
  clues_discovered  text[] not null default '{}',
  character_states  jsonb not null default '{}',
  turn_count        int not null default 0,
  updated_at        timestamptz not null default now()
);

alter table public.story_state enable row level security;
create policy "Users own their story state"
  on public.story_state for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = story_state.project_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = story_state.project_id and p.user_id = auth.uid()
    )
  );

-- ── semantic search helper ────────────────────────────────────────────────────
create or replace function public.match_scenes(
  query_embedding  vector(1536),
  project_id       uuid,
  match_threshold  float default 0.7,
  match_count      int   default 5
)
returns table (id uuid, content text, similarity float)
language sql stable
as $$
  select
    s.id,
    s.content,
    1 - (s.embedding <=> query_embedding) as similarity
  from public.scenes s
  where
    s.project_id = match_scenes.project_id
    and s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) > match_threshold
  order by s.embedding <=> query_embedding
  limit match_count;
$$;
