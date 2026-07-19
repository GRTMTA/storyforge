import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStory } from '@/contexts/StoryContext'
import {
  listProjects,
  loadProjectStats,
  loadProjectSetup,
  loadScenes,
  loadChoicesForScene,
  loadStoryState,
} from '@/services/storyService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProjectDetailDrawer } from './ProjectDetailDrawer'
import {
  Plus, Clock, Wand2, GitBranch, Users, Film, Trophy,
  BookOpen, BarChart3, Layers, Zap, Import, LayoutTemplate,
  ArrowRight, Activity,
} from 'lucide-react'
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

// ── Format helpers ─────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - d.getTime()) / 36e5)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label, sub }: { icon: React.ElementType; value: number | string; label: string; sub?: string }) {
  return (
    <div className="flex-1 min-w-0 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#F5A623]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#F5A623]" />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#F8F6F0]">{value}</p>
      <p className="text-xs text-[#F8F6F0]/50 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#F5A623]/60 mt-1">{sub}</p>}
    </div>
  )
}

// ── Quick action button ────────────────────────────────────────────────────────

function QuickAction({ icon: Icon, label, onClick, primary }: { icon: React.ElementType; label: string; onClick?: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer border ${
        primary
          ? 'bg-[#F5A623] text-[#1A1A3E] border-[#F5A623] hover:bg-[#F5A623]/90'
          : 'bg-[#2D2D5E]/50 text-[#F8F6F0]/70 border-[#3D3D7A] hover:bg-[#2D2D5E]/80 hover:text-[#F8F6F0]'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}

// ── DashboardTab ──────────────────────────────────────────────────────────────

export function DashboardTab() {
  const { user } = useAuth()
  const { dispatch } = useStory()
  const [projects, setProjects]   = useState<ProjectRow[]>([])
  const [stats, setStats]         = useState<Record<string, ProjectStats>>({})
  const [loading, setLoading]     = useState(true)
  const [resuming, setResuming]   = useState<string | null>(null)
  const [detailProject, setDetailProject] = useState<ProjectRow | null>(null)

  useEffect(() => {
    if (!user) return
    listProjects(user.id)
      .then(async (rows) => {
        setProjects(rows)
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
      .finally(() => setLoading(false))
  }, [user])

  const handleResume = async (projectId: string) => {
    setResuming(projectId)
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
    } catch {
      // ignore – user stays on dashboard
    } finally {
      setResuming(null)
    }
  }

  // ── Aggregate stats ──────────────────────────────────────────────────────────
  const totalScenes = Object.values(stats).reduce((s, p) => s + p.sceneCount, 0)
  const totalChars  = Object.values(stats).reduce((s, p) => s + p.characterCount, 0)
  const activeCount = projects.filter(p => p.status === 'active').length
  const recentProjects = projects.slice(0, 5)

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">

      {/* ── Welcome ──────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8F6F0] mb-1">Dashboard</h1>
        <p className="text-[#F8F6F0]/40 text-sm">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}.
        </p>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      <div className="flex gap-4 mb-8 flex-wrap">
        <StatCard icon={BookOpen}  value={projects.length} label="Total Stories"    sub={`${activeCount} active`} />
        <StatCard icon={Users}     value={totalChars}      label="Total Characters" />
        <StatCard icon={Layers}    value={activeCount}     label="Active Projects"  />
        <StatCard icon={Film}      value={totalScenes}     label="Scenes Written"   />
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Quick Start</p>
        <div className="flex flex-wrap gap-2">
          <QuickAction
            icon={Plus}
            label="New Story"
            primary
            onClick={() => dispatch({ type: 'SET_STEP', payload: 'setup' })}
          />
          <QuickAction icon={Import}         label="Import"    />
          <QuickAction icon={LayoutTemplate} label="Templates" />
          <QuickAction icon={Zap}            label="AI Assist" />
        </div>
      </div>

      {/* ── Bottom two-column ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent Stories */}
        <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#3D3D7A]">
            <p className="text-sm font-semibold text-[#F8F6F0]/80 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#F5A623]" /> Recent Stories
            </p>
            <button
              className="text-xs text-[#F5A623]/60 hover:text-[#F5A623] transition-colors cursor-pointer"
              onClick={() => {/* StoriesTab switch handled by sidebar */}}
            >
              View all →
            </button>
          </div>
          <div className="divide-y divide-[#3D3D7A]/50">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="text-center py-10 text-[#F8F6F0]/25">
                <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No stories yet</p>
              </div>
            ) : recentProjects.map(p => {
              const s = stats[p.id]
              const progress = s ? Math.min(100, Math.round((s.sceneCount / 20) * 100)) : 0
              return (
                <div key={p.id} className="px-5 py-3 hover:bg-[#2D2D5E]/40 transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#F8F6F0] truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="gold" className="text-[9px]">{p.genre}</Badge>
                        <span className="text-[10px] text-[#F8F6F0]/30 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> {formatDate(p.updated_at)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {s && (
                        <>
                          <span className="text-[10px] text-[#F8F6F0]/30 flex items-center gap-0.5">
                            <GitBranch className="w-2.5 h-2.5" />{s.branchCount}
                          </span>
                          <span className="text-[10px] text-[#F8F6F0]/30 flex items-center gap-0.5">
                            <Users className="w-2.5 h-2.5" />{s.characterCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1 bg-[#3D3D7A]/40 rounded-full overflow-hidden">
                      <div className="h-full bg-[#F5A623]/60 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-[10px] text-[#F8F6F0]/30">{progress}%</span>
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleResume(p.id)}
                      disabled={resuming === p.id}
                      className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1 bg-[#F5A623] text-[#1A1A3E] rounded-lg font-medium hover:bg-[#F5A623]/90 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {resuming === p.id ? (
                        <div className="w-3 h-3 border-2 border-[#1A1A3E]/40 border-t-[#1A1A3E] rounded-full animate-spin" />
                      ) : (
                        <>Continue <ArrowRight className="w-3 h-3" /></>
                      )}
                    </button>
                    <button
                      onClick={() => setDetailProject(p)}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-[#2D2D5E]/60 text-[#F8F6F0]/50 border border-[#3D3D7A] rounded-lg hover:text-[#F8F6F0]/80 hover:border-[#F5A623]/30 transition-colors cursor-pointer"
                      title="Story map"
                    >
                      <BarChart3 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity + AI Suggestions */}
        <div className="flex flex-col gap-4">

          {/* Recent Activity */}
          <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl overflow-hidden flex-1">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#3D3D7A]">
              <Activity className="w-4 h-4 text-[#F5A623]" />
              <p className="text-sm font-semibold text-[#F8F6F0]/80">Recent Activity</p>
            </div>
            <div className="px-5 py-4">
              {projects.length === 0 ? (
                <p className="text-xs text-[#F8F6F0]/25 text-center py-4">No activity yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentProjects.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#F5A623]/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-[#F5A623]/70" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[#F8F6F0]/70 truncate">{p.title}</p>
                        <p className="text-[10px] text-[#F8F6F0]/30">Updated {formatDate(p.updated_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-[#3D3D7A]">
              <Zap className="w-4 h-4 text-[#F5A623]" />
              <p className="text-sm font-semibold text-[#F8F6F0]/80">AI Suggestions</p>
            </div>
            <div className="px-5 py-4 flex flex-col gap-2">
              {[
                'Try a Mystery set in a Victorian steampunk city',
                'Add an unreliable narrator to your next story',
                'Explore a moral dilemma with no clean resolution',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => dispatch({ type: 'SET_STEP', payload: 'setup' })}
                  className="text-left text-xs px-3 py-2.5 bg-[#1A1A3E]/50 border border-[#3D3D7A] rounded-xl text-[#F8F6F0]/60 hover:border-[#F5A623]/30 hover:text-[#F8F6F0]/80 transition-colors cursor-pointer"
                >
                  ✦ {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Project Detail Modal ──────────────────────────────────────────────── */}
      {detailProject && (
        <ProjectDetailDrawer
          project={detailProject}
          onClose={() => setDetailProject(null)}
        />
      )}
    </div>
  )
}
