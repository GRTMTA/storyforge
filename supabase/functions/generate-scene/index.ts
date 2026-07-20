import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GROQ_API_KEY              = Deno.env.get('GROQ_API_KEY') ?? ''
const SUPABASE_URL               = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const MODEL                      = 'llama-3.3-70b-versatile'
const MAX_RETRIES                = 3
const SIMILARITY_THRESHOLD_HIGH  = 0.85   // too similar → regenerate
const SIMILARITY_THRESHOLD_WARN  = 0.65   // some overlap → suggest variation

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Character {
  name: string
  role: string
  description: string
  traits: string[]
  charGuardrails?: string[]
  biography?: string
}

interface ProjectSetup {
  title: string; genre: string; setting: string; tone: string
  guardrails: string[]; characters: Character[]
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
  branchId?: string
  customChoice?: string   // user-typed free-form choice
}

interface GeneratedScene {
  title: string
  content: string
  isEnding: boolean
  choices: Array<{ label: string; description: string; consequenceHint: string }>
  stateUpdates: { plotThreads?: Record<string, string>; cluesDiscovered?: string[] }
  guardrailViolations: string[]
  consistencyIssues: string[]
}

// ── Groq ──────────────────────────────────────────────────────────────────────

async function callGroq(prompt: string, temperature = 0.85): Promise<string> {
  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a master narrative AI. Always respond with valid JSON only — no markdown, no prose outside the JSON object.' },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: 1600,
      response_format: { type: 'json_object' },
    }),
  })
  if (!resp.ok) throw new Error(`Groq error ${resp.status}: ${await resp.text()}`)
  const data = await resp.json()
  return data.choices?.[0]?.message?.content ?? '{}'
}

// ── Simple cosine similarity on text (word-level, no embeddings needed client-side) ──
// We use the DB match_scenes function which uses pgvector. For dedup without
// embeddings on the Edge Function side, we do a lightweight text comparison.
function roughSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3))
  const wordsB = new Set(b.toLowerCase().split(/\W+/).filter(w => w.length > 3))
  let overlap = 0
  for (const w of wordsA) if (wordsB.has(w)) overlap++
  const union = new Set([...wordsA, ...wordsB]).size
  return union === 0 ? 0 : overlap / union
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildScenePrompt(
  setup: ProjectSetup,
  parentContent: string | null,
  choice: string | null,
  storyState: StoryState | null,
  depth: number,
  similarSceneWarning: string | null,
  consistencyFeedback: string | null,
): string {
  const charSummary = setup.characters.map(c => {
    const bio = c.biography ? `\n  Biography: ${c.biography.slice(0, 200)}` : ''
    const guardrailNote = (c.charGuardrails ?? []).length
      ? `\n  CHARACTER RULES (never break): ${c.charGuardrails!.join('; ')}`
      : ''
    return `- ${c.name} (${c.role}): ${c.description}. Traits: ${c.traits.join(', ')}${bio}${guardrailNote}`
  }).join('\n')

  const stateSummary = storyState
    ? `\nActive plot threads: ${JSON.stringify(storyState.plotThreads)}\nClues discovered: ${storyState.cluesDiscovered.join(', ') || 'none'}\nTurn: ${storyState.turnCount}`
    : ''

  const previousCtx = parentContent
    ? `\nPREVIOUS SCENE (continue from here):\n${parentContent.slice(0, 800)}`
    : ''

  const choiceCtx = choice ? `\nTHE PLAYER CHOSE: "${choice}"` : ''

  const guardrailsText = setup.guardrails.length
    ? setup.guardrails.map(g => `- ${g}`).join('\n')
    : '- None specified'

  const dedupeNote = similarSceneWarning
    ? `\n⚠️ DEDUPLICATION WARNING: A previous scene was too similar (>85% word overlap). You MUST write something clearly different. Avoid: ${similarSceneWarning}`
    : ''

  const consistencyNote = consistencyFeedback
    ? `\n⚠️ CONSISTENCY FEEDBACK (fix these issues from the previous attempt):\n${consistencyFeedback}`
    : ''

  const endingInstruction = depth >= 4
    ? 'You SHOULD consider making this scene an ending (set isEnding: true) if the story naturally concludes.'
    : 'Only set isEnding: true for a definitive story conclusion.'

  return `You are a master narrative AI for an interactive ${setup.genre} story titled "${setup.title}".

SYNOPSIS: ${setup.setting}
TONE: ${setup.tone}
CHARACTERS:
${charSummary}
${stateSummary}${previousCtx}${choiceCtx}${dedupeNote}${consistencyNote}

STORY GUARDRAILS (enforce strictly — never violate):
${guardrailsText}

${endingInstruction}

Return ONLY valid JSON with this exact shape:
{
  "title": "Scene title (4-8 words)",
  "content": "Rich narrative prose, 200-350 words. Second person (you). Vivid sensory details. Match the ${setup.tone.toLowerCase()} tone. Directly follow from player's choice.",
  "isEnding": false,
  "choices": [
    { "label": "Short action (3-7 words)", "description": "One sentence", "consequenceHint": "Subtle hint" }
  ],
  "stateUpdates": { "plotThreads": {}, "cluesDiscovered": [] },
  "guardrailViolations": [],
  "consistencyIssues": []
}

Rules:
- choices: exactly 3 items (distinct outcomes); 0 only when isEnding is true
- guardrailViolations: list any guardrails you had to soften
- consistencyIssues: list any character/plot consistency problems you noticed
- Never break character guardrails unless explicitly permitted
- JSON only, no markdown`
}

// ── Consistency checker ────────────────────────────────────────────────────────

function buildConsistencyPrompt(
  content: string,
  pastContents: string[],
  setup: ProjectSetup,
  guardrails: string[],
): string {
  const pastSummary = pastContents.slice(-3).map((c, i) => `Scene ${i + 1}: ${c.slice(0, 300)}`).join('\n\n')
  const charRules = setup.characters.map(c =>
    `${c.name} (${c.role}): traits=${c.traits.join(',')}; guardrails=${(c.charGuardrails ?? []).join('; ') || 'none'}`
  ).join('\n')

  return `You are a story consistency checker. Review this new scene against story context.

NEW SCENE:
${content.slice(0, 600)}

PAST SCENES (for continuity):
${pastSummary || 'None yet.'}

CHARACTER RULES:
${charRules}

STORY GUARDRAILS:
${guardrails.map(g => `- ${g}`).join('\n') || '- None'}

Check these categories:
1. Guardrail compliance (does the scene violate any guardrail?)
2. Character consistency (personality, voice, abilities match established traits?)
3. Plot continuity (any contradictions with past scenes?)
4. Repetition (is this too similar to a past scene?)

Return JSON:
{
  "passed": true,
  "violations": ["list any violations"],
  "severity": "none|warn|block"
}

- "none" = passed, no issues
- "warn" = minor issues, acceptable
- "block" = must regenerate
`
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured for generate-scene')
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase Edge Function environment is incomplete')
    }

    const body: RequestBody = await req.json()
    const { projectId, setup, parentSceneId, storyState, branchId } = body
    if (!projectId || !setup?.title || !Array.isArray(setup.characters)) {
      throw new Error('Invalid scene generation request')
    }
    const choiceLabel = body.customChoice || body.choiceLabel || null

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── 1. Load parent scene context ──────────────────────────────────────────
    let parentContent: string | null = null
    let depth = 0
    let sceneOrder = 0

    if (parentSceneId) {
      const { data: parentScene } = await supabaseClient
        .from('scenes').select('content, depth, scene_order').eq('id', parentSceneId).single()
      if (parentScene) {
        parentContent = parentScene.content
        depth = (parentScene.depth ?? 0) + 1
        sceneOrder = (parentScene.scene_order ?? 0) + 1
      }
    }

    const { count } = await supabaseClient
      .from('scenes').select('id', { count: 'exact', head: true }).eq('project_id', projectId)
    sceneOrder = Math.max(sceneOrder, count ?? 0)

    // ── 2. Load past scene contents for dedup + consistency ───────────────────
    const { data: pastScenes } = await supabaseClient
      .from('scenes').select('content').eq('project_id', projectId)
      .order('scene_order', { ascending: false }).limit(10)
    const pastContents: string[] = (pastScenes ?? []).map((s: { content: string }) => s.content)

    // ── 3. Generation loop with retry ─────────────────────────────────────────
    let generated: GeneratedScene | null = null
    let finalViolations: string[] = []
    let retryFeedback: string | null = null
    let similarWarning: string | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const prompt = buildScenePrompt(
        setup, parentContent, choiceLabel, storyState ?? null, depth,
        similarWarning, retryFeedback,
      )

      const raw = await callGroq(prompt, 0.85 + attempt * 0.05)
      let candidate: GeneratedScene
      try { candidate = JSON.parse(raw) }
      catch { throw new Error('AI returned invalid JSON: ' + raw.slice(0, 200)) }

      // ── 3a. Deduplication check ─────────────────────────────────────────────
      let isTooSimilar = false
      for (const past of pastContents) {
        const sim = roughSimilarity(candidate.content, past)
        if (sim > SIMILARITY_THRESHOLD_HIGH) {
          isTooSimilar = true
          similarWarning = `Opening phrase or major motifs from a past scene (similarity=${(sim * 100).toFixed(0)}%)`
          break
        }
      }
      if (isTooSimilar && attempt < MAX_RETRIES - 1) continue

      // ── 3b. Consistency check ───────────────────────────────────────────────
      let consistencyBlock = false
      if (pastContents.length > 0) {
        const checkPrompt = buildConsistencyPrompt(candidate.content, pastContents, setup, setup.guardrails)
        try {
          const checkRaw = await callGroq(checkPrompt, 0.2)
          const check = JSON.parse(checkRaw)
          if (check.severity === 'block' && attempt < MAX_RETRIES - 1) {
            consistencyBlock = true
            retryFeedback = (check.violations ?? []).join('; ')
          } else {
            finalViolations = [
              ...(candidate.guardrailViolations ?? []),
              ...(check.violations ?? []).map((v: string) => `Consistency: ${v}`),
            ]
          }
        } catch {
          // consistency check failed silently — proceed
          finalViolations = candidate.guardrailViolations ?? []
        }
      } else {
        finalViolations = candidate.guardrailViolations ?? []
      }

      if (!consistencyBlock) {
        generated = candidate
        break
      }
    }

    // If all retries exhausted still null, use last attempt
    if (!generated) {
      const prompt = buildScenePrompt(setup, parentContent, choiceLabel, storyState ?? null, depth, null, null)
      const raw = await callGroq(prompt)
      generated = JSON.parse(raw)
      finalViolations = generated!.guardrailViolations ?? []
    }

    // ── 4. Guardrail keyword filter ───────────────────────────────────────────
    const contentLower = generated!.content.toLowerCase()
    for (const rule of setup.guardrails) {
      if (rule.toLowerCase().includes('no explicit violence') &&
          (contentLower.includes('gore') || contentLower.includes('graphic blood'))) {
        finalViolations.push(`Content moderated: explicit violence (rule: "${rule}")`)
      }
    }

    // ── 5. Persist scene ──────────────────────────────────────────────────────
    const { data: scene, error: sceneErr } = await supabaseClient
      .from('scenes').insert({
        project_id: projectId,
        parent_scene_id: parentSceneId ?? null,
        branch_id: branchId ?? null,
        title: generated!.title,
        content: generated!.content,
        choice_made: choiceLabel ?? null,
        scene_order: sceneOrder,
        depth,
        is_ending: generated!.isEnding ?? false,
        metadata: { model: MODEL, violations: finalViolations },
      }).select().single()

    if (sceneErr || !scene) throw new Error(sceneErr?.message ?? 'Failed to save scene')

    // ── 6. Persist choices ────────────────────────────────────────────────────
    const choiceRows = (generated!.choices ?? []).map((c) => ({
      scene_id: scene.id,
      label: c.label,
      description: c.description ?? '',
      consequence_hint: c.consequenceHint ?? '',
      leads_to_scene_id: null,
    }))

    let persistedChoices: Array<{
      id: string; scene_id: string; label: string; description: string
      consequence_hint: string; leads_to_scene_id: string | null; created_at: string
    }> = []
    if (choiceRows.length > 0) {
      const { data: choices } = await supabaseClient.from('choices').insert(choiceRows).select()
      persistedChoices = choices ?? []
    }

    // ── 7. Update story state ─────────────────────────────────────────────────
    const existingState = storyState ?? { plotThreads: {}, cluesDiscovered: [], characterStates: {}, turnCount: 0 }
    const newPlotThreads = { ...existingState.plotThreads, ...(generated!.stateUpdates?.plotThreads ?? {}) }
    const newClues = [...new Set([...existingState.cluesDiscovered, ...(generated!.stateUpdates?.cluesDiscovered ?? [])])]

    const { data: savedState } = await supabaseClient
      .from('story_state').upsert({
        project_id: projectId,
        current_scene_id: scene.id,
        plot_threads: newPlotThreads,
        clues_discovered: newClues,
        character_states: existingState.characterStates,
        turn_count: (existingState.turnCount ?? 0) + 1,
      }, { onConflict: 'project_id' }).select().single()

    return new Response(JSON.stringify({
      scene: {
        id: scene.id, projectId: scene.project_id, parentSceneId: scene.parent_scene_id,
        branchId: scene.branch_id, title: scene.title, content: scene.content,
        choiceMade: scene.choice_made, sceneOrder: scene.scene_order,
        depth: scene.depth, isEnding: scene.is_ending, createdAt: scene.created_at,
      },
      choices: persistedChoices.map(c => ({
        id: c.id, sceneId: c.scene_id, label: c.label, description: c.description,
        consequenceHint: c.consequence_hint, leadsToSceneId: c.leads_to_scene_id,
      })),
      stateUpdates: savedState ? {
        id: savedState.id, projectId: savedState.project_id,
        currentSceneId: savedState.current_scene_id,
        plotThreads: savedState.plot_threads, cluesDiscovered: savedState.clues_discovered,
        characterStates: savedState.character_states, turnCount: savedState.turn_count,
      } : {},
      guardrailViolations: finalViolations,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('generate-scene error:', message)
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
