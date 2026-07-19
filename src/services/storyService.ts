import { supabase } from '@/lib/supabase'
import type {
  ProjectSetup,
  ProjectStats,
  Scene,
  Choice,
  StoryState,
  GenerateSceneResponse,
  Character,
  CharacterGuardrail,
} from '@/types/story'

// ── eslint-disable for all `any` casts needed to work around Supabase generic inference ──
/* eslint-disable @typescript-eslint/no-explicit-any */

const db = () => supabase as any

/** Create project + characters in DB, returns projectId */
export async function createProject(setup: ProjectSetup, userId: string): Promise<string> {
  const { data: project, error: projectErr } = await db()
    .from('projects')
    .insert({
      user_id: userId,
      title: setup.title,
      genre: setup.genre,
      setting: setup.setting,
      tone: setup.tone,
      guardrails: setup.guardrails,
      status: 'active',
    })
    .select('id')
    .single()

  if (projectErr || !project) throw new Error(projectErr?.message ?? 'Failed to create project')
  const projectId: string = project.id

  for (const char of setup.characters) {
    await db().from('characters').insert({
      project_id: projectId,
      name: char.name,
      role: char.role,
      description: char.description,
      traits: char.traits,
      
      current_state: {},
    })
  }

  return projectId
}

/** List all projects for a user */
export async function listProjects(userId: string): Promise<any[]> {
  const { data, error } = await db()
    .from('projects')
    .select('id, title, genre, tone, status, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

/** Get per-project stats: scene count, character count, branches, endings */
export async function loadProjectStats(projectId: string): Promise<ProjectStats> {
  const [{ count: sceneCount }, { count: charCount }, { data: scenes }, { data: state }] =
    await Promise.all([
      db().from('scenes').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      db().from('characters').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
      db().from('scenes').select('id, parent_scene_id, is_ending').eq('project_id', projectId),
      db().from('story_state').select('turn_count, updated_at').eq('project_id', projectId).maybeSingle(),
    ])

  const sceneArr: any[] = scenes ?? []
  const parentCounts: Record<string, number> = {}
  for (const s of sceneArr) {
    if (s.parent_scene_id) parentCounts[s.parent_scene_id] = (parentCounts[s.parent_scene_id] ?? 0) + 1
  }
  const branchCount = Object.values(parentCounts).filter(c => c > 1).length
  const endingCount = sceneArr.filter(s => s.is_ending).length

  return {
    sceneCount: sceneCount ?? 0,
    characterCount: charCount ?? 0,
    branchCount,
    endingCount,
    turnCount: state?.turn_count ?? 0,
    lastPlayedAt: state?.updated_at ?? null,
  }
}

/** Load a full project setup */
export async function loadProjectSetup(projectId: string): Promise<ProjectSetup> {
  const { data: project, error: projErr } = await db()
    .from('projects')
    .select('title, genre, setting, tone, guardrails')
    .eq('id', projectId)
    .single()

  if (projErr || !project) throw new Error(projErr?.message ?? 'Project not found')

  const { data: chars, error: charErr } = await db()
    .from('characters')
    .select('id, name, role, description, traits')
    .eq('project_id', projectId)

  if (charErr) throw new Error(charErr.message)

  return {
    title: project.title,
    genre: project.genre,
    setting: project.setting,
    tone: project.tone,
    guardrails: project.guardrails ?? [],
    characters: (chars ?? []).map((c: any): Character => ({
      id: c.id,
      name: c.name,
      role: c.role,
      description: c.description,
      traits: c.traits ?? [],
      
    })),
  }
}

/** Load characters with full detail for a project */
export async function loadCharacters(projectId: string): Promise<Character[]> {
  const { data, error } = await db()
    .from('characters')
    .select('id, name, role, description, traits')
    .eq('project_id', projectId)
    .order('role', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((c: any): Character => ({
    id: c.id,
    name: c.name,
    role: c.role,
    description: c.description,
    traits: c.traits ?? [],
    
  }))
}

/** Load per-character guardrails */
export async function loadCharacterGuardrails(projectId: string): Promise<CharacterGuardrail[]> {
  const { data, error } = await db()
    .from('character_guardrails')
    .select('id, character_id, project_id, rule, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map((r: any): CharacterGuardrail => ({
    id: r.id,
    characterId: r.character_id,
    projectId: r.project_id,
    rule: r.rule,
    createdAt: r.created_at,
  }))
}

/** Add a per-character guardrail */
export async function addCharacterGuardrail(
  projectId: string,
  characterId: string,
  rule: string,
): Promise<CharacterGuardrail> {
  const { data, error } = await db()
    .from('character_guardrails')
    .insert({ project_id: projectId, character_id: characterId, rule })
    .select()
    .single()

  if (error || !data) throw new Error(error?.message ?? 'Failed to add guardrail')
  return { id: data.id, characterId: data.character_id, projectId: data.project_id, rule: data.rule, createdAt: data.created_at }
}

/** Remove a per-character guardrail */
export async function removeCharacterGuardrail(id: string): Promise<void> {
  const { error } = await db().from('character_guardrails').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Call the generate-scene Edge Function */
export async function generateScene(
  projectId: string,
  setup: ProjectSetup,
  parentSceneId?: string,
  choiceLabel?: string,
  storyState?: StoryState,
): Promise<GenerateSceneResponse> {
  const { data, error } = await supabase.functions.invoke<GenerateSceneResponse>('generate-scene', {
    body: { projectId, setup, parentSceneId, choiceLabel, storyState },
  })
  if (error || !data) throw new Error(error?.message ?? 'Edge Function error')
  return data
}

/** Load full scene tree for a project */
export async function loadScenes(projectId: string): Promise<Scene[]> {
  const { data, error } = await db()
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('scene_order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToScene)
}

/** Load choices for a scene (unresolved only) */
export async function loadChoicesForScene(sceneId: string): Promise<Choice[]> {
  const { data, error } = await db()
    .from('choices')
    .select('*')
    .eq('scene_id', sceneId)
    .is('leads_to_scene_id', null)

  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToChoice)
}

/** Load story state */
export async function loadStoryState(projectId: string): Promise<StoryState | null> {
  const { data, error } = await db()
    .from('story_state')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return rowToStoryState(data)
}

/** Export story as formatted markdown */
export async function exportStoryAsText(projectId: string, title: string): Promise<string> {
  const scenes = await loadScenes(projectId)
  const lines: string[] = [`# ${title}`, '', '---', '']
  for (const scene of scenes) {
    const indent = '  '.repeat(scene.depth)
    lines.push(`${indent}## ${scene.title}`)
    if (scene.choiceMade) lines.push(`${indent}*Choice: ${scene.choiceMade}*`)
    lines.push('')
    scene.content.split('\n').forEach(l => lines.push(`${indent}${l}`))
    lines.push('')
  }
  return lines.join('\n')
}

// ── Row mappers ────────────────────────────────────────────────────────────────

function rowToScene(row: any): Scene {
  return {
    id: row.id,
    projectId: row.project_id,
    parentSceneId: row.parent_scene_id ?? null,
    title: row.title,
    content: row.content,
    choiceMade: row.choice_made ?? null,
    sceneOrder: row.scene_order,
    depth: row.depth,
    isEnding: row.is_ending,
    createdAt: row.created_at,
  }
}

function rowToChoice(row: any): Choice {
  return {
    id: row.id,
    sceneId: row.scene_id,
    label: row.label,
    description: row.description,
    consequenceHint: row.consequence_hint,
    leadsToSceneId: row.leads_to_scene_id ?? null,
  }
}

function rowToStoryState(data: any): StoryState {
  return {
    id: data.id,
    projectId: data.project_id,
    currentSceneId: data.current_scene_id,
    plotThreads: (data.plot_threads as Record<string, string>) ?? {},
    cluesDiscovered: (data.clues_discovered as string[]) ?? [],
    characterStates: (data.character_states as Record<string, Record<string, unknown>>) ?? {},
    turnCount: data.turn_count as number,
  }
}
