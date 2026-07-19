import { useState } from 'react'
import { useStory } from '@/contexts/StoryContext'
import { generateScene } from '@/services/storyService'
import type { Choice } from '@/types/story'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Wand2, ChevronRight, BookMarked, Users, Lightbulb, Map, AlertTriangle } from 'lucide-react'

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

function ChoiceCard({ choice, onSelect, disabled }: { choice: Choice; onSelect: () => void; disabled: boolean }) {
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

export function PlayStep() {
  const { state, dispatch } = useStory()
  const { currentScene, currentChoices, storyState, setup, projectId, generating, error } = state
  const [stateVisible, setStateVisible] = useState(false)
  const [guardrailWarnings, setGuardrailWarnings] = useState<string[]>([])

  const handleChoice = async (choice: Choice) => {
    if (!projectId || !setup || !currentScene) return

    dispatch({ type: 'SET_GENERATING', payload: true })
    setGuardrailWarnings([])

    try {
      const result = await generateScene(
        projectId,
        setup,
        currentScene.id,
        choice.label,
        storyState ?? undefined,
      )
      dispatch({ type: 'ADD_SCENE', payload: { scene: result.scene, choices: result.choices } })
      if (result.stateUpdates) dispatch({ type: 'SET_STORY_STATE', payload: result.stateUpdates as never })
      if (result.guardrailViolations?.length) setGuardrailWarnings(result.guardrailViolations)
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Generation failed' })
    }
  }

  const turnCount = storyState?.turnCount ?? state.scenes.length
  const isEnding = currentScene?.isEnding ?? false

  return (
    <div className="min-h-screen bg-[#1A1A3E] px-4 py-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">
        {/* Topbar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F8F6F0]">{setup?.title ?? 'Story'}</h1>
            <p className="text-xs text-[#F8F6F0]/40">Turn {turnCount} · {setup?.genre} · {setup?.tone}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStateVisible(v => !v)}
              className="text-xs"
            >
              <BookMarked className="w-3.5 h-3.5" />
              State
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => dispatch({ type: 'SET_STEP', payload: 'review' })}
            >
              <Map className="w-3.5 h-3.5" />
              Review
            </Button>
          </div>
        </div>

        {/* State sidebar panel */}
        {stateVisible && storyState && (
          <Card className="text-sm">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[#F5A623]" />
              <span className="font-bold text-[#F8F6F0]">Story State</span>
            </div>
            {Object.keys(storyState.plotThreads).length > 0 && (
              <div className="mb-3">
                <p className="text-[#F8F6F0]/50 text-xs uppercase tracking-wide mb-1.5">Plot Threads</p>
                <div className="flex flex-col gap-1">
                  {Object.entries(storyState.plotThreads).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-xs">
                      <span className="text-[#F5A623] font-medium shrink-0">{k}:</span>
                      <span className="text-[#F8F6F0]/70">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {storyState.cluesDiscovered.length > 0 && (
              <div>
                <p className="text-[#F8F6F0]/50 text-xs uppercase tracking-wide mb-1.5 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Clues
                </p>
                <div className="flex flex-wrap gap-1">
                  {storyState.cluesDiscovered.map(c => (
                    <Badge key={c} variant="gold">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
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

        {/* Scene content */}
        {generating ? (
          <SceneLoader />
        ) : currentScene ? (
          <>
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

            {/* Choices */}
            {!isEnding && currentChoices.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium text-[#F8F6F0]/40 uppercase tracking-wide px-1">
                  What do you do?
                </p>
                {currentChoices.map(choice => (
                  <ChoiceCard
                    key={choice.id}
                    choice={choice}
                    onSelect={() => handleChoice(choice)}
                    disabled={generating}
                  />
                ))}
              </div>
            )}

            {isEnding && (
              <div className="text-center py-6">
                <p className="text-[#F5A623] font-semibold mb-2">Your story has reached its conclusion.</p>
                <Button onClick={() => dispatch({ type: 'SET_STEP', payload: 'review' })}>
                  <Map className="w-4 h-4" /> View Story Map
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  )
}
