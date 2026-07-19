import { supabase } from '@/lib/supabase'
import type {
  ProjectSetup,
  Scene,
  Choice,
  StoryState,
  GenerateSceneResponse,
} from '@/types/story'

/** Create project + characters in DB, returns projectId */
export async function createProject(setup: ProjectSetup, userId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data: project, error: projectErr } = await db
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
    await db.from('characters').insert({
      project_id: projectId,
      name: char.name,
      role: char.role,
      description: char.description,
      traits: char.traits,
      backstory: char.backstory,
      current_state: {},
    })
  }

  return projectId
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('scenes')
    .select('*')
    .eq('project_id', projectId)
    .order('scene_order', { ascending: true })

  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(rowToScene)
}

/** Load choices for a scene */
export async function loadChoices(sceneId: string): Promise<Choice[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('choices')
    .select('*')
    .eq('scene_id', sceneId)

  if (error) throw new Error(error.message)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map(rowToChoice)
}

/** Load story state */
export async function loadStoryState(projectId: string): Promise<StoryState | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data, error } = await db
    .from('story_state')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return rowToStoryState(data)
}

/** Export story as formatted text */
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

// ── Row mappers ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
