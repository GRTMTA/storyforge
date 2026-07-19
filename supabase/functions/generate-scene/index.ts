import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const MODEL = 'meta-llama/llama-3.2-3b-instruct:free'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Character {
  name: string
  role: string
  description: string
  traits: string[]
  backstory: string
}

interface ProjectSetup {
  title: string
  genre: string
  setting: string
  tone: string
  guardrails: string[]
  characters: Character[]
}

interface StoryState {
  currentSceneId: string
  plotThreads: Record<string, string>
  cluesDiscovered: string[]
  characterStates: Record<string, Record<string, unknown>>
  turnCount: number
}

interface RequestBody {
  projectId: string
  setup: ProjectSetup
  parentSceneId?: string
  choiceLabel?: string
  storyState?: StoryState
}

interface GeneratedScene {
  title: string
  content: string
  isEnding: boolean
  choices: Array<{
    label: string
    description: string
    consequenceHint: string
  }>
  stateUpdates: {
    plotThreads?: Record<string, string>
    cluesDiscovered?: string[]
  }
  guardrailViolations: string[]
}

async function callOpenRouter(prompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://storyforge.app',
      'X-Title': 'StoryForge',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.85,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${err}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content ?? '{}'
}

function buildPrompt(
  setup: ProjectSetup,
  parentContent: string | null,
  choiceLabel: string | null,
  storyState: StoryState | null,
  depth: number,
): string {
  const charSummary = setup.characters
    .map(c => `- ${c.name} (${c.role}): ${c.description}. Traits: ${c.traits.join(', ')}`)
    .join('\n')

  const stateSummary = storyState
    ? `\nCurrent plot threads: ${JSON.stringify(storyState.plotThreads)}\nClues found: ${storyState.cluesDiscovered.join(', ')}\nTurn: ${storyState.turnCount}`
    : ''

  const previousCtx = parentContent
    ? `\n\nPrevious scene summary:\n${parentContent.slice(0, 600)}`
    : ''

  const choiceCtx = choiceLabel ? `\nThe player chose: "${choiceLabel}"` : ''

  const guardrailsText = setup.guardrails.map(g => `- ${g}`).join('\n')

  const isLateGame = depth >= 4
  const endingInstruction = isLateGame
    ? 'You SHOULD consider making this scene an ending (set isEnding: true) if it feels like a natural conclusion.'
    : 'Only set isEnding: true if this is a definitive story conclusion (depth >= 5).'

  return `You are a master narrative AI for an interactive ${setup.genre} story titled "${setup.title}".

SETTING: ${setup.setting}
TONE: ${setup.tone}
CHARACTERS:
${charSummary}
${stateSummary}${previousCtx}${choiceCtx}

GUARDRAILS (enforce strictly):
${guardrailsText}

${endingInstruction}

Write the next scene. Return ONLY valid JSON matching this exact schema:
{
  "title": "Scene title (4-8 words)",
  "content": "Rich narrative prose (200-350 words). Second person (you). Vivid sensory details. Advance the ${setup.tone.toLowerCase()} tone.",
  "isEnding": false,
  "choices": [
    {
      "label": "Short action label (3-7 words)",
      "description": "One sentence elaboration",
      "consequenceHint": "Subtle hint at consequence"
    }
  ],
  "stateUpdates": {
    "plotThreads": {},
    "cluesDiscovered": []
  },
  "guardrailViolations": []
}

Rules:
- choices array: 2-4 items (0 items only if isEnding is true)
- guardrailViolations: list any guardrail rules you had to soften or work around
- stateUpdates.plotThreads: key=thread name, value=current status
- stateUpdates.cluesDiscovered: new clues only (not already discovered)
- content must not break any listed guardrail rules
- JSON only, no markdown fences`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body: RequestBody = await req.json()
    const { projectId, setup, parentSceneId, choiceLabel, storyState } = body

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Load parent scene content for context
    let parentContent: string | null = null
    let depth = 0
    let sceneOrder = 0

    if (parentSceneId) {
      const { data: parentScene } = await supabase
        .from('scenes')
        .select('content, depth, scene_order')
        .eq('id', parentSceneId)
        .single()

      if (parentScene) {
        parentContent = parentScene.content
        depth = (parentScene.depth ?? 0) + 1
        sceneOrder = (parentScene.scene_order ?? 0) + 1
      }
    }

    // Count existing scenes for ordering
    const { count } = await supabase
      .from('scenes')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)

    sceneOrder = Math.max(sceneOrder, count ?? 0)

    // Generate via OpenRouter
    const prompt = buildPrompt(setup, parentContent, choiceLabel ?? null, storyState ?? null, depth)
    const raw = await callOpenRouter(prompt)

    let generated: GeneratedScene
    try {
      generated = JSON.parse(raw)
    } catch {
      throw new Error('AI returned invalid JSON: ' + raw.slice(0, 200))
    }

    // Guardrail post-processing: truncate anything suspicious
    const contentLower = generated.content.toLowerCase()
    const violations: string[] = [...(generated.guardrailViolations ?? [])]

    for (const rule of setup.guardrails) {
      if (rule.toLowerCase().includes('no explicit violence') && (
        contentLower.includes('gore') || contentLower.includes('graphic blood')
      )) {
        violations.push(`Content moderated: explicit violence detected (rule: "${rule}")`)
      }
    }

    // Persist scene
    const { data: scene, error: sceneErr } = await supabase
      .from('scenes')
      .insert({
        project_id: projectId,
        parent_scene_id: parentSceneId ?? null,
        title: generated.title,
        content: generated.content,
        choice_made: choiceLabel ?? null,
        scene_order: sceneOrder,
        depth,
        is_ending: generated.isEnding ?? false,
        metadata: { model: MODEL, violations },
      })
      .select()
      .single()

    if (sceneErr || !scene) throw new Error(sceneErr?.message ?? 'Failed to save scene')

    // Persist choices
    const choiceRows = (generated.choices ?? []).map((c) => ({
      scene_id: scene.id,
      label: c.label,
      description: c.description ?? '',
      consequence_hint: c.consequenceHint ?? '',
      leads_to_scene_id: null,
    }))

    let persistedChoices: Array<{ id: string; scene_id: string; label: string; description: string; consequence_hint: string; leads_to_scene_id: string | null; created_at: string }> = []
    if (choiceRows.length > 0) {
      const { data: choices } = await supabase.from('choices').insert(choiceRows).select()
      persistedChoices = choices ?? []
    }

    // Upsert story state
    const existingState = storyState ?? {
      plotThreads: {},
      cluesDiscovered: [],
      characterStates: {},
      turnCount: 0,
    }

    const newPlotThreads = { ...existingState.plotThreads, ...(generated.stateUpdates?.plotThreads ?? {}) }
    const newClues = [
      ...new Set([...existingState.cluesDiscovered, ...(generated.stateUpdates?.cluesDiscovered ?? [])]),
    ]

    const { data: savedState } = await supabase
      .from('story_state')
      .upsert({
        project_id: projectId,
        current_scene_id: scene.id,
        plot_threads: newPlotThreads,
        clues_discovered: newClues,
        character_states: existingState.characterStates,
        turn_count: (existingState.turnCount ?? 0) + 1,
      }, { onConflict: 'project_id' })
      .select()
      .single()

    const responseData = {
      scene: {
        id: scene.id,
        projectId: scene.project_id,
        parentSceneId: scene.parent_scene_id,
        title: scene.title,
        content: scene.content,
        choiceMade: scene.choice_made,
        sceneOrder: scene.scene_order,
        depth: scene.depth,
        isEnding: scene.is_ending,
        createdAt: scene.created_at,
      },
      choices: persistedChoices.map(c => ({
        id: c.id,
        sceneId: c.scene_id,
        label: c.label,
        description: c.description,
        consequenceHint: c.consequence_hint,
        leadsToSceneId: c.leads_to_scene_id,
      })),
      stateUpdates: savedState
        ? {
            id: savedState.id,
            projectId: savedState.project_id,
            currentSceneId: savedState.current_scene_id,
            plotThreads: savedState.plot_threads as Record<string, string>,
            cluesDiscovered: savedState.clues_discovered,
            characterStates: savedState.character_states as Record<string, Record<string, unknown>>,
            turnCount: savedState.turn_count,
          }
        : {},
      guardrailViolations: violations,
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('generate-scene error:', message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
