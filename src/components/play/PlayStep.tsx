import { useState } from 'react'
import { useStory } from '@/contexts/StoryContext'
import { generateScene, createSavepoint, listBranches, ensureMainBranch } from '@/services/storyService'
import type { Choice } from '@/types/story'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { CharacterPanel } from './CharacterPanel'
import {
  Wand2, ChevronRight, BookMarked, Users, Map, AlertTriangle,
  Bookmark, Loader2, PenLine,
} from 'lucide-react'

// ── Loading spinner ───────────────────────────────────────────────────────────
function SceneLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-[#3D3D7A]" />
        <div className="absolute inset-0 rounded-full border-4 border-[#F5A623] border-t-transparent animate-spin" />
        <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-[#F5A623]" />
      </div>
      <div className="text-center">
        <p className="text-[#F8F6F0] font-medium">The AI is weaving your story…</p>
        <p className="text-[#F8F6F0]/40 text-sm mt-1">Consulting the narrative engines</p>
      </div>
    </div>
  )
}

// ── Preset choice card ────────────────────────────────────────────────────────
function ChoiceCard({
  choice,
  onSelect,
  disabled,
}: {
  choice: Choice
  onSelect: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className="w-full text-left p-4 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl hover:border-[#F5A623]/60 hover:bg-[#2D2D5E]/70 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#F5A623]/25 transition-colors">
          <ChevronRight className="w-3.5 h-3.5 text-[#F5A623]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#F8F6F0] text-sm leading-snug">{choice.label}</p>
          {choice.description && (
            <p className="text-[#F8F6F0]/55 text-xs mt-1 leading-relaxed">{choice.description}</p>
          )}
          {choice.consequenceHint && (
            <p className="text-[#F5A623]/70 text-xs mt-1.5 italic">→ {choice.consequenceHint}</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Savepoint modal ───────────────────────────────────────────────────────────
interface SavepointModalProps {
  onSave: (name: string, description: string) => Promise<void>
  onClose: () => void
}

function SavepointModal({ onSave, onClose }: SavepointModalProps) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), desc.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[#F8F6F0] flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-[#F5A623]" /> Save as Savepoint
        </h2>
        <p className="text-sm text-[#F8F6F0]/50">
          Create a named bookmark at this scene. You can branch from it later.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-[#F8F6F0]/60 block mb-1">Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Before the forest"
              className="w-full px-3 py-2 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#F8F6F0]/60 block mb-1">Description (optional)</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              placeholder="What's significant about this moment?"
              className="w-full px-3 py-2 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
            Save Savepoint
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Main PlayStep ─────────────────────────────────────────────────────────────
export function PlayStep() {
  const { state, dispatch } = useStory()
  const {
    currentScene, currentChoices, storyState, setup, projectId,
    generating, error, activeBranchId,
  } = state

  const [charPanelVisible, setCharPanelVisible] = useState(false)
  const [guardrailWarnings, setGuardrailWarnings] = useState<string[]>([])
  const [customChoice, setCustomChoice] = useState('')
  const [savepointModalOpen, setSavepointModalOpen] = useState(false)

  // Trigger generation for a choice (preset or custom)
  const handleChoice = async (choiceLabel: string) => {
    if (!projectId || !setup || !currentScene) return

    dispatch({ type: 'SET_GENERATING', payload: true })
    setGuardrailWarnings([])

    try {
      const result = await generateScene(
        projectId,
        setup,
        currentScene.id,
        choiceLabel,
        storyState ?? undefined,
        activeBranchId ?? undefined,
      )
      dispatch({ type: 'ADD_SCENE', payload: { scene: result.scene, choices: result.choices } })
      if (result.stateUpdates) dispatch({ type: 'SET_STORY_STATE', payload: result.stateUpdates as never })
      if (result.guardrailViolations?.length) setGuardrailWarnings(result.guardrailViolations)
      setCustomChoice('')
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Generation failed' })
    }
  }

  // Generate opening scene
  const handleGenerateOpening = async () => {
    if (!projectId || !setup) return

    dispatch({ type: 'SET_GENERATING', payload: true })
    setGuardrailWarnings([])

    try {
      // Ensure main branch exists
      const branchId = await ensureMainBranch(projectId)
      dispatch({ type: 'SET_BRANCH', payload: branchId })

      const result = await generateScene(
        projectId,
        setup,
        undefined,
        undefined,
        undefined,
        branchId,
      )
      dispatch({ type: 'ADD_SCENE', payload: { scene: result.scene, choices: result.choices } })
      if (result.stateUpdates) dispatch({ type: 'SET_STORY_STATE', payload: result.stateUpdates as never })
      if (result.guardrailViolations?.length) setGuardrailWarnings(result.guardrailViolations)
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Generation failed' })
    }
  }

  const handleCustomChoice = () => {
    const label = customChoice.trim()
    if (!label) return
    handleChoice(label)
  }

  const handleSavepoint = async (name: string, description: string) => {
    if (!projectId || !currentScene) return
    let branchId = activeBranchId
    if (!branchId) {
      const branches = await listBranches(projectId)
      const main = branches.find(b => b.name === 'main') ?? branches[0]
      branchId = main?.id ?? null
    }
    await createSavepoint(projectId, currentScene.id, name, description, branchId)
  }

  const turnCount = storyState?.turnCount ?? state.scenes.length
  const isEnding = currentScene?.isEnding ?? false
  const hasScenes = state.scenes.length > 0

  return (
    <div className="min-h-screen bg-[#1A1A3E] px-4 py-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">

        {/* ── Topbar ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F8F6F0]">{setup?.title ?? 'Story'}</h1>
            <p className="text-xs text-[#F8F6F0]/40">
              Turn {turnCount} · {setup?.genre} · {setup?.tone}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasScenes && currentScene && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSavepointModalOpen(true)}
                className="text-xs"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save Point
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCharPanelVisible(v => !v)}
              className="text-xs"
            >
              <Users className="w-3.5 h-3.5" />
              Characters
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'SET_PLAY_TAB', payload: 'branches' })}
            >
              <Map className="w-3.5 h-3.5" />
              Story Map
            </Button>
          </div>
        </div>

        {/* Character panel */}
        {charPanelVisible && projectId && (
          <CharacterPanel
            projectId={projectId}
            onClose={() => setCharPanelVisible(false)}
          />
        )}

        {/* Guardrail warnings */}
        {guardrailWarnings.length > 0 && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              <p className="font-medium mb-0.5">Guardrail adjustments made:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {guardrailWarnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Scene content ───────────────────────────────────────────────────── */}
        {generating ? (
          <SceneLoader />
        ) : !hasScenes ? (
          /* ── No scenes yet: opening scene CTA ──────────────────────────────── */
          <div className="flex flex-col items-center justify-center gap-6 py-20">
            <div className="w-20 h-20 rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center">
              <BookMarked className="w-10 h-10 text-[#F5A623]/60" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-[#F8F6F0] mb-2">Ready to begin?</h2>
              <p className="text-[#F8F6F0]/50 text-sm max-w-xs">
                Your story world is set. Generate the opening scene to start your adventure.
              </p>
            </div>
            <Button size="lg" onClick={handleGenerateOpening}>
              <Wand2 className="w-4 h-4" /> Generate Opening Scene
            </Button>
          </div>
        ) : currentScene ? (
          <>
            {/* Scene card */}
            <Card>
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold text-[#F8F6F0]">{currentScene.title}</h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isEnding && <Badge variant="gold">Ending</Badge>}
                  <Badge variant="default">Scene {state.scenes.length}</Badge>
                </div>
              </div>
              {currentScene.choiceMade && (
                <p className="text-xs text-[#F5A623]/70 italic mb-3">
                  You chose: "{currentScene.choiceMade}"
                </p>
              )}
              <CardContent className="p-0">
                <div className="prose prose-sm max-w-none">
                  {currentScene.content.split('\n\n').map((para, i) => (
                    <p key={i} className="text-[#F8F6F0]/85 leading-relaxed mb-3 last:mb-0">
                      {para}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Preset choices */}
            {!isEnding && currentChoices.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-[#F8F6F0]/40 uppercase tracking-wide px-1">
                  What do you do?
                </p>
                {currentChoices.map(choice => (
                  <ChoiceCard
                    key={choice.id}
                    choice={choice}
                    onSelect={() => handleChoice(choice.label)}
                    disabled={generating}
                  />
                ))}
              </div>
            )}

            {/* Custom choice input */}
            {!isEnding && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-[#F8F6F0]/40 uppercase tracking-wide px-1">
                  Or write your own choice
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl focus-within:border-[#F5A623]/50 transition-colors">
                    <PenLine className="w-4 h-4 text-[#F8F6F0]/30 shrink-0" />
                    <input
                      value={customChoice}
                      onChange={e => setCustomChoice(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !generating && handleCustomChoice()}
                      placeholder="Describe what you want to do…"
                      disabled={generating}
                      className="flex-1 bg-transparent text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!customChoice.trim() || generating}
                    onClick={handleCustomChoice}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Ending CTA */}
            {isEnding && (
              <div className="text-center py-6">
                <p className="text-[#F5A623] font-semibold mb-2">Your story has reached its conclusion.</p>
                <Button onClick={() => dispatch({ type: 'SET_PLAY_TAB', payload: 'branches' })}>
                  <Map className="w-4 h-4" /> View Story Map
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Savepoint modal */}
      {savepointModalOpen && (
        <SavepointModal
          onSave={handleSavepoint}
          onClose={() => setSavepointModalOpen(false)}
        />
      )}
    </div>
  )
}
