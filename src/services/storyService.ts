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
  CharacterRelation,
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
      biography: char.biography ?? '',
      custom_fields: char.customFields ?? {},
      relations: char.relations ?? [],
      is_active: char.isActive ?? true,
      current_state: {},
    })
  }

  return projectId
}

/** Update editable project fields */
export async function updateProject(
  projectId: string,
  patch: { title?: string; genre?: string; tone?: string; setting?: string },
): Promise<void> {
  const { error } = await db().from('projects').update(patch).eq('id', projectId)
  if (error) throw new Error(error.message)
}

/** Update story-level guardrails array */
export async function updateProjectGuardrails(projectId: string, guardrails: string[]): Promise<void> {
  const { error } = await db().from('projects').update({ guardrails }).eq('id', projectId)
  if (error) throw new Error(error.message)
}

/** Permanently delete a project and all its data */
export async function deleteProject(projectId: string): Promise<void> {
  // Delete in dependency order (FK cascades handle most, but be explicit)
  await db().from('story_state').delete().eq('project_id', projectId)
  await db().from('savepoints').delete().eq('project_id', projectId)
  await db().from('branches').delete().eq('project_id', projectId)
  const { data: scenes } = await db().from('scenes').select('id').eq('project_id', projectId)
  if (scenes?.length) {
    const ids = scenes.map((s: any) => s.id)
    await db().from('choices').delete().in('scene_id', ids)
  }
  await db().from('scenes').delete().eq('project_id', projectId)
  await db().from('character_guardrails').delete().eq('project_id', projectId)
  await db().from('characters').delete().eq('project_id', projectId)
  const { error } = await db().from('projects').delete().eq('id', projectId)
  if (error) throw new Error(error.message)
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
    .select('id, name, role, description, traits, biography, custom_fields, relations, is_active')
    .eq('project_id', projectId)

  if (charErr) throw new Error(charErr.message)

  return {
    title: project.title,
    genre: project.genre,
    setting: project.setting,
    tone: project.tone,
    guardrails: project.guardrails ?? [],
    characters: (chars ?? []).map(rowToCharacter),
  }
}

/** Load characters with full detail for a project */
export async function loadCharacters(projectId: string): Promise<Character[]> {
  const { data, error } = await db()
    .from('characters')
    .select('id, name, role, description, traits, biography, custom_fields, relations, is_active')
    .eq('project_id', projectId)
    .order('role', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToCharacter)
}

/** Update a character's fields */
export async function updateCharacter(
  characterId: string,
  patch: Partial<Pick<Character, 'name' | 'role' | 'description' | 'traits' | 'biography' | 'customFields' | 'relations' | 'isActive'>>,
): Promise<void> {
  const dbPatch: Record<string, unknown> = {}
  if (patch.name       !== undefined) dbPatch.name         = patch.name
  if (patch.role       !== undefined) dbPatch.role         = patch.role
  if (patch.description!== undefined) dbPatch.description  = patch.description
  if (patch.traits     !== undefined) dbPatch.traits       = patch.traits
  if (patch.biography  !== undefined) dbPatch.biography    = patch.biography
  if (patch.customFields!== undefined) dbPatch.custom_fields = patch.customFields
  if (patch.relations  !== undefined) dbPatch.relations    = patch.relations
  if (patch.isActive  !== undefined) dbPatch.is_active    = patch.isActive
  const { error } = await db().from('characters').update(dbPatch).eq('id', characterId)
  if (error) throw new Error(error.message)
}

/** Add a character to a project */
export async function addCharacter(projectId: string, char: Omit<Character, 'id'>): Promise<Character> {
  const { data, error } = await db()
    .from('characters')
    .insert({
      project_id: projectId,
      name: char.name,
      role: char.role,
      description: char.description,
      traits: char.traits,
      biography: char.biography ?? '',
      custom_fields: char.customFields ?? {},
      relations: char.relations ?? [],
      is_active: char.isActive ?? true,
      current_state: {},
    })
    .select('id, name, role, description, traits, biography, custom_fields, relations, is_active')
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to add character')
  return rowToCharacter(data)
}

/** Permanently delete a character and clean relationship/state references. */
export async function deleteCharacter(characterId: string): Promise<void> {
  const { error } = await db().rpc('delete_character', { target_character_id: characterId })
  if (error) throw new Error(error.message)
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
  branchId?: string,
): Promise<GenerateSceneResponse> {
  const { data, error } = await supabase.functions.invoke<GenerateSceneResponse>('generate-scene', {
    body: { projectId, setup, parentSceneId, choiceLabel, storyState, branchId },
  })
  if (error) {
    const context = (error as { context?: Response }).context
    if (context) {
      try {
        const payload = await context.clone().json() as { error?: string }
        if (payload.error) throw new Error(payload.error)
      } catch (cause) {
        if (cause instanceof Error && cause.message !== 'Unexpected end of JSON input') throw cause
      }
    }
    throw new Error(error.message)
  }
  if (!data) throw new Error('Scene generation returned no data')
  return data
}

export async function loadScene(sceneId: string): Promise<Scene> {
  const { data, error } = await db().from('scenes').select('*').eq('id', sceneId).single()
  if (error || !data) throw new Error(error?.message ?? 'Scene not found')
  return rowToScene(data)
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

/** Load choices for a scene (unresolved / pending only) */
export async function loadChoicesForScene(sceneId: string): Promise<Choice[]> {
  const { data, error } = await db()
    .from('choices')
    .select('*')
    .eq('scene_id', sceneId)
    .is('leads_to_scene_id', null)

  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToChoice)
}

/** Load all choices for a scene (including resolved) */
export async function loadAllChoicesForScene(sceneId: string): Promise<Choice[]> {
  const { data, error } = await db()
    .from('choices')
    .select('*')
    .eq('scene_id', sceneId)

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

function rowToCharacter(c: any): Character {
  return {
    id: c.id,
    name: c.name,
    role: c.role,
    description: c.description,
    traits: c.traits ?? [],
    biography: c.biography ?? '',
    customFields: (c.custom_fields as Record<string, string>) ?? {},
    relations: (c.relations as CharacterRelation[]) ?? [],
    isActive: c.is_active ?? true,
  }
}

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

// ── Branch helpers ─────────────────────────────────────────────────────────────

export interface Branch {
  id: string
  projectId: string
  name: string
  description: string
  isActive: boolean
  rootSceneId: string | null
  createdAt: string
}

export interface Savepoint {
  id: string
  projectId: string
  branchId: string | null
  sceneId: string
  name: string
  description: string
  createdAt: string
}

export async function listBranches(projectId: string): Promise<Branch[]> {
  const { data, error } = await db()
    .from('branches')
    .select('id, project_id, name, description, is_active, root_scene_id, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: any): Branch => ({
    id: r.id, projectId: r.project_id, name: r.name,
    description: r.description, isActive: r.is_active,
    rootSceneId: r.root_scene_id, createdAt: r.created_at,
  }))
}

export async function createBranch(
  projectId: string,
  name: string,
  description: string,
  rootSceneId: string | null,
): Promise<Branch> {
  const { data, error } = await db()
    .from('branches')
    .insert({ project_id: projectId, name, description, is_active: false, root_scene_id: rootSceneId })
    .select().single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create branch')
  return { id: data.id, projectId: data.project_id, name: data.name, description: data.description, isActive: data.is_active, rootSceneId: data.root_scene_id, createdAt: data.created_at }
}

export async function setActiveBranch(projectId: string, branchId: string): Promise<void> {
  // deactivate all
  await db().from('branches').update({ is_active: false }).eq('project_id', projectId)
  // activate target
  await db().from('branches').update({ is_active: true }).eq('id', branchId)
}

export async function deleteBranch(branchId: string): Promise<void> {
  const { error } = await db().from('branches').delete().eq('id', branchId)
  if (error) throw new Error(error.message)
}

export async function listSavepoints(projectId: string): Promise<Savepoint[]> {
  const { data, error } = await db()
    .from('savepoints')
    .select('id, project_id, branch_id, scene_id, name, description, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: any): Savepoint => ({
    id: r.id, projectId: r.project_id, branchId: r.branch_id,
    sceneId: r.scene_id, name: r.name, description: r.description, createdAt: r.created_at,
  }))
}

export async function createSavepoint(
  projectId: string,
  sceneId: string,
  name: string,
  description: string,
  branchId: string | null,
): Promise<Savepoint> {
  const { data, error } = await db()
    .from('savepoints')
    .insert({ project_id: projectId, scene_id: sceneId, name, description, branch_id: branchId })
    .select().single()
  if (error || !data) throw new Error(error?.message ?? 'Failed to create savepoint')
  return { id: data.id, projectId: data.project_id, branchId: data.branch_id, sceneId: data.scene_id, name: data.name, description: data.description, createdAt: data.created_at }
}

export async function deleteSavepoint(savepointId: string): Promise<void> {
  const { error } = await db().from('savepoints').delete().eq('id', savepointId)
  if (error) throw new Error(error.message)
}

/** Load scenes for a specific branch (null branchId = unbranchd / main) */
export async function loadScenesByBranch(projectId: string, branchId: string | null): Promise<Scene[]> {
  let q = db().from('scenes').select('*').eq('project_id', projectId)
  if (branchId) q = q.eq('branch_id', branchId)
  else q = q.is('branch_id', null)
  const { data, error } = await q.order('scene_order', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToScene)
}

/** Ensure a "main" branch exists for a project, return its id */
export async function ensureMainBranch(projectId: string): Promise<string> {
  const { data } = await db()
    .from('branches').select('id').eq('project_id', projectId).eq('name', 'main').maybeSingle()
  if (data?.id) return data.id
  const branch = await createBranch(projectId, 'main', 'Main story branch', null)
  await setActiveBranch(projectId, branch.id)
  return branch.id
}
