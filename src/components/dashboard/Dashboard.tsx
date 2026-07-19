import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStory } from '@/contexts/StoryContext'
import { listProjects, loadProjectStats, loadProjectSetup, loadScenes, loadChoicesForScene, loadStoryState } from '@/services/storyService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProjectDetailPage } from './ProjectDetailDrawer'
import { BookOpen, Plus, Clock, Wand2, GitBranch, Users, Film, Trophy } from 'lucide-react'
import type { ProjectStats } from '@/types/story'

interface ProjectRow {
  id: string
  title: string
  genre: string
  tone: string
  status: string
  created_at: string
  updated_at: string
}

function StatPill({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1 text-[#F8F6F0]/50 text-xs">
      <Icon className="w-3 h-3 text-[#F5A623]/60" />
      <span className="font-semibold text-[#F8F6F0]/70">{value}</span>
      <span>{label}</span>
    </div>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const { dispatch } = useStory()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [stats, setStats] = useState<Record<string, ProjectStats>>({})
  const [loading, setLoading] = useState(true)
  const [resuming, setResuming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detailProject, setDetailProject] = useState<ProjectRow | null>(null)

  useEffect(() => {
    if (!user) return
    listProjects(user.id)
      .then(async (rows) => {
        setProjects(rows)
        // load stats for all projects in parallel (best-effort)
        const entries = await Promise.allSettled(
          rows.map(async (p: ProjectRow) => {
            const s = await loadProjectStats(p.id)
            return [p.id, s] as [string, ProjectStats]
          })
        )
        const map: Record<string, ProjectStats> = {}
        for (const r of entries) {
          if (r.status === 'fulfilled') map[r.value[0]] = r.value[1]
        }
        setStats(map)
      })
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

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diffH = Math.floor((now.getTime() - d.getTime()) / 36e5)
    if (diffH < 1) return 'Just now'
    if (diffH < 24) return `${diffH}h ago`
    if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-[#1A1A3E] px-4 py-10">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#F5A623]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#F8F6F0]">StoryForge</h1>
              <p className="text-[#F8F6F0]/40 text-sm">Your narrative worlds</p>
            </div>
          </div>
          <Button onClick={() => dispatch({ type: 'SET_STEP', payload: 'setup' })} className="gap-2">
            <Plus className="w-4 h-4" /> New Story
          </Button>
        </div>

        {/* ── Error ─────────────────────────────────────────────────────────── */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Project grid ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-[#F8F6F0]/30">
            <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-[#F8F6F0]/50 mb-1">No stories yet</p>
            <p className="text-sm">Click "New Story" to forge your first narrative.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projects.map(p => {
              const s = stats[p.id]
              return (
                <div
                  key={p.id}
                  onClick={() => setDetailProject(p)}
                  className="group relative bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-5 cursor-pointer hover:border-[#F5A623]/50 hover:bg-[#2D2D5E]/60 transition-all"
                >
                  {/* Genre badge */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="gold" className="text-[10px]">{p.genre}</Badge>
                    <Badge variant="default" className="text-[10px] flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDate(p.updated_at)}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-[#F8F6F0] text-base leading-snug mb-1 group-hover:text-[#F5A623] transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-[#F8F6F0]/40 text-xs mb-4">{p.tone}</p>

                  {/* Stats row */}
                  {s ? (
                    <div className="flex flex-wrap gap-3 mb-4">
                      <StatPill icon={Film} value={s.sceneCount} label="scenes" />
                      <StatPill icon={Users} value={s.characterCount} label="characters" />
                      <StatPill icon={GitBranch} value={s.branchCount} label="branches" />
                      <StatPill icon={Trophy} value={s.endingCount} label="endings" />
                    </div>
                  ) : (
                    <div className="h-5 mb-4 flex items-center">
                      <div className="w-24 h-3 bg-[#3D3D7A]/60 rounded-full animate-pulse" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => setDetailProject(p)}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      loading={resuming === p.id}
                      onClick={() => handleResume(p.id)}
                    >
                      Resume
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Project Detail ────────────────────────────────────────────────── */}
      {detailProject && (
        <div className="fixed inset-0 z-50 bg-[#1A1A3E] overflow-y-auto">
          <ProjectDetailPage
            project={detailProject}
            onBack={() => setDetailProject(null)}
          />
        </div>
      )}
    </div>
  )
}
