set search_path = public, extensions;

alter table public.characters
  drop constraint if exists characters_role_check;
alter table public.characters
  add constraint characters_role_check
  check (role in ('protagonist', 'antagonist', 'supporting', 'minor'));

alter table public.characters
  add column if not exists embedding extensions.vector(1536);
alter table public.characters
  add column if not exists embedding_model text;
alter table public.scenes
  add column if not exists embedding_model text;

create or replace function public.match_scenes(
  query_embedding extensions.vector(1536),
  project_id uuid,
  match_threshold float default 0.65,
  match_count int default 5
)
returns table (id uuid, content text, similarity float)
language sql stable
set search_path = public, extensions
as '
  select s.id, s.content, 1 - (s.embedding <=> query_embedding) as similarity
  from public.scenes s
  where s.project_id = match_scenes.project_id
    and s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) >= match_threshold
  order by s.embedding <=> query_embedding
  limit match_count
';

create or replace function public.match_characters(
  query_embedding extensions.vector(1536),
  filter_project_id uuid,
  match_count int default 4
)
returns table (id uuid, similarity float)
language sql stable
set search_path = public, extensions
as '
  select c.id, 1 - (c.embedding <=> query_embedding) as similarity
  from public.characters c
  where c.project_id = filter_project_id and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count
';

grant execute on function public.match_scenes(extensions.vector, uuid, float, int) to authenticated, service_role;
grant execute on function public.match_characters(extensions.vector, uuid, int) to authenticated, service_role;

notify pgrst, 'reload schema';