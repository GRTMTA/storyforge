import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStory } from '@/contexts/StoryContext'
import { useToast } from '@/contexts/ToastContext'
import {
  listProjects,
  loadProjectStats,
  loadProjectSetup,
  loadScenes,
  loadChoicesForScene,
  loadStoryState,
} from '@/services/storyService'
import { Badge } from '@/components/ui/Badge'
import { DashboardListSkeleton } from '@/components/ui/Skeleton'
import {
  Clock, GitBranch, Users, Film,
  BookOpen, Layers, Zap,
  ArrowRight, Activity, TrendingUp, BarChart2,
} from 'lucide-react'
import type { ProjectStats, Scene } from '@/types/story'

interface ProjectRow {
  id: string
  title: string
  genre: string
  tone: string
  status: string
  created_at: string
  updated_at: string
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - d.getTime()) / 36e5)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Large stat card ───────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, value, label, sub,
}: {
  icon: React.ElementType
  value: number | string
  label: string
  sub?: string
}) {
  return (
    <div className="flex-1 bg-[#2D2D5E]/50 border border-[#3D3D7A] rounded-2xl p-7 flex flex-col gap-4">
      <div className="w-12 h-12 rounded-xl bg-[#F5A623]/12 border border-[#F5A623]/25 flex items-center justify-center">
        <Icon className="w-6 h-6 text-[#F5A623]" />
      </div>
      <div>
        <p className="text-4xl font-bold text-[#F8F6F0] leading-none">{value}</p>
        <p className="text-sm text-[#F8F6F0]/50 mt-2">{label}</p>
        {sub && <p className="text-xs text-[#F5A623]/60 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export function DashboardTab() {
  const { user } = useAuth()
  const { dispatch } = useStory()
  const { toast } = useToast()
  const [projects, setProjects]   = useState<ProjectRow[]>([])
  const [stats, setStats]         = useState<Record<string, ProjectStats>>({})
  const [loading, setLoading]     = useState(true)
  const [resuming, setResuming]   = useState<string | null>(null)

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
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Failed to load story', 'error')
    }
    finally { setResuming(null) }
  }

  // ── Writing analytics ─────────────────────────────────────────────────────
  const [allScenes, setAllScenes] = useState<Scene[]>([])

  useEffect(() => {
    if (projects.length === 0) return
    const stored = localStorage.getItem('scribis:analytics:scenes')
    if (stored) { try { setAllScenes(JSON.parse(stored)) } catch { /* ignore */ } }
    Promise.all(projects.map(p => loadScenes(p.id))).then(sceneLists => {
      const flat = sceneLists.flat()
      setAllScenes(flat)
      localStorage.setItem('scribis:analytics:scenes', JSON.stringify(flat))
    }).catch(() => {/* silent */})
  }, [projects])

  const analytics = useMemo(() => {
    const totalWords = allScenes.reduce((sum, s) => sum + s.content.split(/\s+/).filter(Boolean).length, 0)
    const avgLen = allScenes.length > 0 ? Math.round(totalWords / allScenes.length) : 0

    // Writing streak: count consecutive days from today
    const dateSet = new Set(
      projects.map(p => new Date(p.updated_at).toDateString())
    )
    let streak = 0
    const d = new Date()
    while (dateSet.has(d.toDateString())) {
      streak++
      d.setDate(d.getDate() - 1)
    }

    // Most active day
    const dayCounts: number[] = Array(7).fill(0)
    projects.forEach(p => {
      dayCounts[new Date(p.updated_at).getDay()]++
    })
    const maxDay = dayCounts.indexOf(Math.max(...dayCounts))
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    return { totalWords, avgLen, streak, mostActiveDay: days[maxDay] }
  }, [allScenes, projects])

  const totalScenes = Object.values(stats).reduce((s, p) => s + p.sceneCount, 0)
  const totalChars  = Object.values(stats).reduce((s, p) => s + p.characterCount, 0)
  const activeCount = projects.filter(p => p.status === 'active').length
  const recentProjects = projects.slice(0, 5)

  return (
    <div className="px-10 py-10 w-full">

      {/* ── Welcome ───────────────────────────────────────────────────────────── */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-[#F8F6F0] mb-1">Dashboard</h1>
        <p className="text-[#F8F6F0]/40">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}.
        </p>
      </div>

      {/* ── Stats row (full-width, evenly spaced) ─────────────────────────────── */}
      <div className="flex gap-5 mb-10">
        <StatCard icon={BookOpen} value={projects.length} label="Total Stories"    sub={`${activeCount} active`} />
        <StatCard icon={Users}    value={totalChars}      label="Total Characters" />
        <StatCard icon={Layers}   value={activeCount}     label="Active Projects"  />
        <StatCard icon={Film}     value={totalScenes}     label="Scenes Written"   />
      </div>

      {/* ── Two-column content ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-7">

        {/* Recent Stories */}
        <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#3D3D7A]">
            <p className="text-base font-semibold text-[#F8F6F0]/90 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#F5A623]" /> Recent Stories
            </p>
            <button
              className="text-sm text-[#F5A623]/60 hover:text-[#F5A623] transition-colors cursor-pointer"
              onClick={() => {}}
            >
              View all →
            </button>
          </div>

          <div className="divide-y divide-[#3D3D7A]/50">
            {loading ? (
              <DashboardListSkeleton rows={3} />
            ) : recentProjects.length === 0 ? (
              <div className="text-center py-14 text-[#F8F6F0]/25">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-base">No stories yet</p>
                <p className="text-sm mt-1 text-[#F8F6F0]/20">Go to Stories to create your first.</p>
              </div>
            ) : recentProjects.map(p => {
              const s = stats[p.id]
              const progress = s ? Math.min(100, Math.round((s.sceneCount / 20) * 100)) : 0
              return (
                <div key={p.id} className="px-6 py-4 hover:bg-[#2D2D5E]/40 transition-colors">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-base font-medium text-[#F8F6F0] truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="gold" className="text-[10px]">{p.genre}</Badge>
                        <span className="text-xs text-[#F8F6F0]/30 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDate(p.updated_at)}
                        </span>
                      </div>
                    </div>
                    {s && (
                      <div className="flex items-center gap-3 shrink-0 text-xs text-[#F8F6F0]/30">
                        <span className="flex items-center gap-1">
                          <GitBranch className="w-3.5 h-3.5" />{s.branchCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />{s.characterCount}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-1.5 bg-[#3D3D7A]/40 rounded-full overflow-hidden">
                      <div className="h-full bg-[#F5A623]/60 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="text-xs text-[#F8F6F0]/30 shrink-0">{progress}%</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResume(p.id)}
                      disabled={resuming === p.id}
                      className="flex-1 flex items-center justify-center gap-1.5 text-sm px-3 py-2 bg-[#F5A623] text-[#1A1A3E] rounded-lg font-semibold hover:bg-[#F5A623]/90 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {resuming === p.id
                        ? <div className="w-3.5 h-3.5 border-2 border-[#1A1A3E]/40 border-t-[#1A1A3E] rounded-full animate-spin" />
                        : <><span>Continue</span><ArrowRight className="w-3.5 h-3.5" /></>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-7">

          {/* Recent Activity */}
          <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-5 border-b border-[#3D3D7A]">
              <Activity className="w-5 h-5 text-[#F5A623]" />
              <p className="text-base font-semibold text-[#F8F6F0]/90">Recent Activity</p>
            </div>
            <div className="px-6 py-5">
              {projects.length === 0 ? (
                <p className="text-sm text-[#F8F6F0]/25 text-center py-6">No activity yet.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {recentProjects.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-[#F5A623]/10 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-[#F5A623]/70" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[#F8F6F0]/80 truncate font-medium">{p.title}</p>
                        <p className="text-xs text-[#F8F6F0]/30 mt-0.5">Updated {formatDate(p.updated_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-5 border-b border-[#3D3D7A]">
              <Zap className="w-5 h-5 text-[#F5A623]" />
              <p className="text-base font-semibold text-[#F8F6F0]/90">AI Suggestions</p>
            </div>
            <div className="px-6 py-5 flex flex-col gap-3">
              {[
                'Try a Mystery set in a Victorian steampunk city',
                'Add an unreliable narrator to your next story',
                'Explore a moral dilemma with no clean resolution',
                'Write a story where the antagonist is sympathetic',
              ].map(s => (
                <button
                  key={s}
                  onClick={() => dispatch({ type: 'SET_STEP', payload: 'setup' })}
                  className="text-left text-sm px-4 py-3 bg-[#1A1A3E]/50 border border-[#3D3D7A] rounded-xl text-[#F8F6F0]/60 hover:border-[#F5A623]/30 hover:text-[#F8F6F0]/80 transition-colors cursor-pointer"
                >
                  ✦ {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Writing Analytics ──────────────────────────────────────────────────── */}
      <div className="mt-7 bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-[#3D3D7A]">
          <BarChart2 className="w-5 h-5 text-[#F5A623]" />
          <p className="text-base font-semibold text-[#F8F6F0]/90">Writing Analytics</p>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { icon: TrendingUp, label: 'Total Words Written', value: analytics.totalWords.toLocaleString() },
            { icon: Film,       label: 'Scenes Generated',    value: totalScenes.toString() },
            { icon: BarChart2,  label: 'Avg Scene Length',    value: `${analytics.avgLen} words` },
            { icon: Activity,   label: 'Writing Streak',      value: `${analytics.streak} day${analytics.streak !== 1 ? 's' : ''}` },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[#F8F6F0]/40 text-xs">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <p className="text-2xl font-bold text-[#F8F6F0]">{value}</p>
            </div>
          ))}
        </div>
        {projects.length > 0 && (
          <div className="px-6 pb-5 flex items-center gap-2 text-xs text-[#F8F6F0]/30">
            <Zap className="w-3 h-3 text-[#F5A623]" />
            Most active day: <span className="text-[#F5A623]/70 ml-1">{analytics.mostActiveDay}</span>
          </div>
        )}
      </div>

    </div>
  )
}
