set search_path = public, extensions;

alter table public.characters
  add column if not exists is_active boolean not null default true;

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
  where c.project_id = filter_project_id
    and c.is_active
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit match_count
';

create or replace function public.delete_character(target_character_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.characters c
    join public.projects p on p.id = c.project_id
    where c.id = target_character_id and p.user_id = auth.uid()
  ) then
    raise exception 'Character not found or access denied';
  end if;

  update public.characters c
  set relations = coalesce((
    select jsonb_agg(relation)
    from jsonb_array_elements(c.relations) relation
    where relation ->> 'targetId' <> target_character_id::text
  ), '[]'::jsonb)
  where c.relations @> jsonb_build_array(jsonb_build_object('targetId', target_character_id::text));

  update public.story_state
  set character_states = character_states - target_character_id::text
  where character_states ? target_character_id::text;

  delete from public.characters where id = target_character_id;
end;
$$;

grant execute on function public.delete_character(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'scenes'
  ) then
    alter publication supabase_realtime add table public.scenes;
  end if;
end $$;

notify pgrst, 'reload schema';