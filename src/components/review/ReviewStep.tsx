import { useState } from 'react'
import { useStory } from '@/contexts/StoryContext'
import { exportStoryAsText } from '@/services/storyService'
import { StoryMap } from './StoryMap'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  Download,
  FileText,
  FileJson,
  ChevronLeft,
  BookOpen,
  GitBranch,
  Map,
  Trophy,
} from 'lucide-react'

export function ReviewStep() {
  const { state, dispatch } = useStory()
  const { scenes, currentScene, storyState, setup, projectId } = state
  const [exportLoading, setExportLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'map' | 'timeline'>('map')

  const totalScenes = scenes.length
  const endings = scenes.filter(s => s.isEnding).length
  const maxDepth = Math.max(...scenes.map(s => s.depth), 0)

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportText = async () => {
    if (!projectId || !setup) return
    setExportLoading(true)
    try {
      const text = await exportStoryAsText(projectId, setup.title)
      downloadFile(text, `${setup.title.replace(/\s+/g, '_')}.md`, 'text/markdown')
    } catch (e) {
      console.error(e)
    } finally {
      setExportLoading(false)
    }
  }

  const handleExportJson = () => {
    if (!setup) return
    const data = {
      title: setup.title,
      genre: setup.genre,
      setting: setup.setting,
      tone: setup.tone,
      characters: setup.characters,
      scenes: scenes.map(s => ({
        id: s.id,
        title: s.title,
        content: s.content,
        choiceMade: s.choiceMade,
        depth: s.depth,
        isEnding: s.isEnding,
        parentSceneId: s.parentSceneId,
      })),
      storyState,
    }
    downloadFile(JSON.stringify(data, null, 2), `${setup.title.replace(/\s+/g, '_')}.json`, 'application/json')
  }

  const tabs = [
    { id: 'map' as const, label: 'Story Map', icon: Map },
    { id: 'timeline' as const, label: 'Timeline', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-[#1A1A3E] px-4 py-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'SET_STEP', payload: 'play' })}
              className="mb-2"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Play
            </Button>
            <h1 className="text-2xl font-bold text-[#F8F6F0]">{setup?.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="gold">{setup?.genre}</Badge>
              <Badge variant="default">{setup?.tone}</Badge>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" size="sm" loading={exportLoading} onClick={handleExportText}>
              <FileText className="w-3.5 h-3.5" /> .md
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportJson}>
              <FileJson className="w-3.5 h-3.5" /> .json
            </Button>
            <Button size="sm" onClick={handleExportText} loading={exportLoading}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Scenes', value: totalScenes, icon: BookOpen },
            { label: 'Branches', value: maxDepth, icon: GitBranch },
            { label: 'Endings', value: endings, icon: Trophy },
            { label: 'Characters', value: setup?.characters.length ?? 0, icon: Trophy },
          ].map(stat => (
            <div key={stat.label} className="bg-[#2D2D5E]/50 border border-[#3D3D7A] rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-[#F5A623]">{stat.value}</p>
              <p className="text-xs text-[#F8F6F0]/50 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Characters summary */}
        {setup && setup.characters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Characters</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-wrap gap-2">
                {setup.characters.map(char => (
                  <div
                    key={char.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-lg"
                  >
                    <span className="text-sm font-medium text-[#F8F6F0]">{char.name}</span>
                    <Badge
                      variant={
                        char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'
                      }
                    >
                      {char.role}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab nav */}
        <div className="flex gap-1 p-1 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === id
                  ? 'bg-[#F5A623] text-[#1A1A3E]'
                  : 'text-[#F8F6F0]/60 hover:text-[#F8F6F0]'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Story Map */}
        {activeTab === 'map' && (
          <StoryMap scenes={scenes} currentSceneId={currentScene?.id} />
        )}

        {/* Timeline */}
        {activeTab === 'timeline' && (
          <div className="flex flex-col gap-3">
            {scenes.map((scene, i) => (
              <div
                key={scene.id}
                className="relative flex gap-4"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center shrink-0">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10 ${
                    scene.isEnding
                      ? 'bg-[#F5A623]/20 border-[#F5A623] text-[#F5A623]'
                      : 'bg-[#2D2D5E] border-[#3D3D7A] text-[#F8F6F0]/60'
                  }`}>
                    {i + 1}
                  </div>
                  {i < scenes.length - 1 && (
                    <div className="w-0.5 flex-1 bg-[#3D3D7A] mt-1" style={{ minHeight: 20 }} />
                  )}
                </div>
                <Card className="flex-1 mb-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-[#F8F6F0] text-sm">{scene.title}</h3>
                    <div className="flex gap-1">
                      {scene.isEnding && <Badge variant="gold">End</Badge>}
                      {scene.choiceMade && <Badge variant="default">D{scene.depth}</Badge>}
                    </div>
                  </div>
                  {scene.choiceMade && (
                    <p className="text-xs text-[#F5A623]/70 italic mb-2">Choice: "{scene.choiceMade}"</p>
                  )}
                  <p className="text-xs text-[#F8F6F0]/60 leading-relaxed line-clamp-3">{scene.content}</p>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Story state */}
        {storyState && (storyState.cluesDiscovered.length > 0 || Object.keys(storyState.plotThreads).length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Final Story State</CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-3">
              {Object.keys(storyState.plotThreads).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#F8F6F0]/50 uppercase tracking-wide mb-2">Plot Threads</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(storyState.plotThreads).map(([k, v]) => (
                      <div key={k} className="p-2 bg-[#1A1A3E]/50 border border-[#3D3D7A] rounded-lg">
                        <p className="text-xs font-semibold text-[#F5A623]">{k}</p>
                        <p className="text-xs text-[#F8F6F0]/60 mt-0.5">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {storyState.cluesDiscovered.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[#F8F6F0]/50 uppercase tracking-wide mb-2">Clues Discovered</p>
                  <div className="flex flex-wrap gap-1.5">
                    {storyState.cluesDiscovered.map(c => (
                      <Badge key={c} variant="gold">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* New story CTA */}
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: 'RESET' })}
          >
            + Start a New Story
          </Button>
        </div>
      </div>
    </div>
  )
}
