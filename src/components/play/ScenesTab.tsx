import { useState } from 'react'
import { useStory } from '@/contexts/StoryContext'
import { loadAllChoicesForScene } from '@/services/storyService'
import type { Scene } from '@/types/story'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { BookOpen, ChevronLeft, ChevronRight, Wand2 } from 'lucide-react'

const PAGE_SIZE = 10

function formatRelative(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH = Math.floor(diffMs / 36e5)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface SceneCardProps {
  scene: Scene
  index: number
  onClick: () => void
  isActive: boolean
}

function SceneCard({ scene, index, onClick, isActive }: SceneCardProps) {
  const preview = scene.content.slice(0, 150).trim()
  const truncated = scene.content.length > 150

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer group ${
        isActive
          ? 'bg-[#F5A623]/10 border-[#F5A623]/50'
          : 'bg-[#2D2D5E]/30 border-[#3D3D7A] hover:border-[#F5A623]/30 hover:bg-[#2D2D5E]/50'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
            isActive ? 'bg-[#F5A623] text-[#1A1A3E]' : 'bg-[#3D3D7A] text-[#F8F6F0]/60'
          }`}>
            {index}
          </span>
          <h3 className={`font-semibold text-sm ${isActive ? 'text-[#F5A623]' : 'text-[#F8F6F0]'}`}>
            {scene.title}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {scene.isEnding && <Badge variant="gold">Ending</Badge>}
          <Badge variant="default">D{scene.depth}</Badge>
        </div>
      </div>

      {scene.choiceMade ? (
        <p className="text-xs text-[#F5A623]/70 italic mb-1.5">
          Choice: "{scene.choiceMade}"
        </p>
      ) : (
        <p className="text-xs text-[#F8F6F0]/30 italic mb-1.5">Opening scene</p>
      )}

      <p className="text-xs text-[#F8F6F0]/55 leading-relaxed">
        {preview}{truncated ? '…' : ''}
      </p>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[#F8F6F0]/25">{formatRelative(scene.createdAt)}</span>
        {isActive && (
          <span className="text-[10px] text-[#F5A623] font-medium">Current scene</span>
        )}
      </div>
    </button>
  )
}

export function ScenesTab({ onOpenScene, onPlay }: { onOpenScene?: () => void; onPlay?: () => void } = {}) {
  const { state, dispatch } = useStory()
  const { scenes, currentScene } = state
  const [page, setPage] = useState(1)
  const [navigating, setNavigating] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(scenes.length / PAGE_SIZE))
  const pageScenes = scenes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSceneClick = async (scene: Scene) => {
    if (navigating) return
    setNavigating(scene.id)
    try {
      const choices = await loadAllChoicesForScene(scene.id)
      // Only show unresolved choices (no leads_to_scene_id)
      const openChoices = choices.filter(c => !c.leadsToSceneId)
      dispatch({ type: 'SET_CURRENT_SCENE', payload: { scene, choices: openChoices } })
      onOpenScene?.()
    } finally {
      setNavigating(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#1A1A3E] px-4 py-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F8F6F0] flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#F5A623]" />
              Scenes
              <span className="text-sm font-normal text-[#F8F6F0]/40">({scenes.length} total)</span>
            </h1>
            <p className="text-xs text-[#F8F6F0]/40 mt-0.5">Click any scene to jump to it</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPlay ? onPlay() : dispatch({ type: 'SET_PLAY_TAB', payload: 'play' })}
          >
            <Wand2 className="w-3.5 h-3.5" /> Play
          </Button>
        </div>

        {/* Scene list */}
        {scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BookOpen className="w-12 h-12 text-[#F8F6F0]/10" />
            <p className="text-[#F8F6F0]/30 text-sm">No scenes yet. Start playing to generate your story.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {pageScenes.map((scene, i) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  index={(page - 1) * PAGE_SIZE + i + 1}
                  onClick={() => handleSceneClick(scene)}
                  isActive={scene.id === currentScene?.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <span className="text-xs text-[#F8F6F0]/40">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
