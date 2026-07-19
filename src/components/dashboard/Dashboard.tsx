import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStory } from '@/contexts/StoryContext'
import {
  listProjects,
  loadProjectSetup,
  loadScenes,
  loadChoicesForScene,
  loadStoryState,
} from '@/services/storyService'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { BookOpen, Plus, Clock, Wand2 } from 'lucide-react'

interface ProjectRow {
  id: string
  title: string
  genre: string
  tone: string
  status: string
  created_at: string
  updated_at: string
}

export function Dashboard() {
  const { user } = useAuth()
  const { dispatch } = useStory()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [resuming, setResuming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    listProjects(user.id)
      .then(setProjects)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load projects'))
      .finally(() => setLoading(false))
  }, [user])

  const handleResume = async (projectId: string) => {
    setResuming(projectId)
    setError(null)
    try {
      const [setup, scenes, storyState] = await Promise.all([
        loadProjectSetup(projectId),
        loadScenes(projectId),
        loadStoryState(projectId),
      ])

      dispatch({ type: 'SET_PROJECT', payload: { projectId, setup } })

      if (scenes.length > 0) {
        const lastScene = scenes[scenes.length - 1]
        const choices = await loadChoicesForScene(lastScene.id)
        dispatch({ type: 'LOAD_HISTORY', payload: { scenes, currentChoices: choices } })
      }

      if (storyState) dispatch({ type: 'SET_STORY_STATE', payload: storyState })
      dispatch({ type: 'SET_STEP', payload: scenes.length > 0 ? 'play' : 'setup' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resume project')
    } finally {
      setResuming(null)
    }
  }

  const handleNew = () => dispatch({ type: 'SET_STEP', payload: 'setup' })

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffH = Math.floor((now.getTime() - d.getTime()) / 36e5)
    if (diffH < 1) return 'Just now'
    if (diffH < 24) return `${diffH}h ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-[#1A1A3E] px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center">
              <BookOpen className="w-7 h-7 text-[#F5A623]" />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-[#F8F6F0] leading-tight">StoryForge</h1>
              <p className="text-[#F8F6F0]/40 text-sm">AI-powered interactive narrative</p>
            </div>
          </div>
          <Button size="lg" onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" />
            New Story
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Project list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16 text-[#F8F6F0]/30">
            <Wand2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No stories yet. Start your first one above.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-widest px-1 mb-1">
              Your Stories
            </h2>
            {projects.map(p => (
              <Card
                key={p.id}
                className="flex items-center gap-4 p-4 hover:border-[#F5A623]/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-[#F5A623]" />
                </div>
                <CardContent className="flex-1 min-w-0 p-0">
                  <p className="font-semibold text-[#F8F6F0] truncate">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="gold" className="text-[10px]">{p.genre}</Badge>
                    <Badge variant="default" className="text-[10px]">{p.tone}</Badge>
                    <span className="text-[#F8F6F0]/30 text-xs flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" />
                      {formatDate(p.updated_at)}
                    </span>
                  </div>
                </CardContent>
                <Button
                  size="sm"
                  variant="outline"
                  loading={resuming === p.id}
                  onClick={() => handleResume(p.id)}
                >
                  Resume
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
