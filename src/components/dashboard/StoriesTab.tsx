import { useEffect, useState, useMemo } from 'react'
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
import {
  Plus, Clock, Wand2, GitBranch, Users, Film, Trophy,
  Search, ChevronDown,
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

type SortOption = 'alpha-asc' | 'alpha-desc' | 'newest' | 'oldest' | 'most-scenes' | 'most-words'
type FilterStatus = 'all' | 'draft' | 'active' | 'completed'

function StatPill({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[#F8F6F0]/50 text-sm">
      <Icon className="w-3.5 h-3.5 text-[#F5A623]/60" />
      <span className="font-semibold text-[#F8F6F0]/70">{value}</span>
      <span>{label}</span>
    </div>
  )
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

interface StoryCard {
  id: string
  title: string
  genre: string
  tone: string
  status: string
  created_at: string
  updated_at: string
}

export function StoriesTab({ onViewDetail }: { onViewDetail?: (p: StoryCard) => void }) {
  const { user } = useAuth()
  const { dispatch } = useStory()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [stats, setStats]       = useState<Record<string, ProjectStats>>({})
  const [loading, setLoading]   = useState(true)
  const [resuming, setResuming] = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)

  // Controls
  const [search, setSearch]         = useState('')
  const [sort, setSort]             = useState<SortOption>('newest')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterGenre, setFilterGenre]   = useState('')
  const [filterTone, setFilterTone]     = useState('')

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

  // Unique genres and tones for filter dropdowns
  const genres = useMemo(() => [...new Set(projects.map(p => p.genre))].sort(), [projects])
  const tones  = useMemo(() => [...new Set(projects.map(p => p.tone))].sort(),  [projects])

  const filtered = useMemo(() => {
    let list = [...projects]

    // search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title.toLowerCase().includes(q))
    }

    // status filter
    if (filterStatus !== 'all') {
      const map: Record<FilterStatus, string> = { all: '', draft: 'setup', active: 'active', completed: 'completed' }
      list = list.filter(p => p.status === map[filterStatus])
    }

    // genre filter
    if (filterGenre) list = list.filter(p => p.genre === filterGenre)

    // tone filter
    if (filterTone) list = list.filter(p => p.tone === filterTone)

    // sort
    list.sort((a, b) => {
      switch (sort) {
        case 'alpha-asc':   return a.title.localeCompare(b.title)
        case 'alpha-desc':  return b.title.localeCompare(a.title)
        case 'newest':      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        case 'oldest':      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        case 'most-scenes': return (stats[b.id]?.sceneCount ?? 0) - (stats[a.id]?.sceneCount ?? 0)
        case 'most-words':  return (stats[b.id]?.sceneCount ?? 0) - (stats[a.id]?.sceneCount ?? 0)
        default: return 0
      }
    })

    return list
  }, [projects, search, filterStatus, filterGenre, filterTone, sort, stats])

  const selectClass = 'h-10 px-3 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm focus:outline-none focus:border-[#F5A623]/50 cursor-pointer'

  return (
    <div className="px-10 py-10 w-full">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="text-center mb-3">
        <h1 className="text-4xl font-bold text-[#F8F6F0]">My Stories</h1>
        <p className="text-[#F8F6F0]/50 text-lg mt-2">
          {projects.length === 0 ? 'No stories yet — create one to begin' : `${projects.length} ${projects.length === 1 ? 'story' : 'stories'} in your collection`}
        </p>
      </div>

      {/* ── Controls row ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap mb-8 mt-6">
        {/* Search */}
        <div className="flex-1 min-w-[200px] flex items-center gap-2 h-10 px-3 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl focus-within:border-[#F5A623]/50 transition-colors">
          <Search className="w-4 h-4 text-[#F8F6F0]/30 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stories…"
            className="flex-1 bg-transparent text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none"
          />
        </div>

        {/* Sort */}
        <div className="relative flex items-center">
          <select value={sort} onChange={e => setSort(e.target.value as SortOption)} className={selectClass}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alpha-asc">A → Z</option>
            <option value="alpha-desc">Z → A</option>
            <option value="most-scenes">Most Scenes</option>
            <option value="most-words">Most Words</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#F8F6F0]/40 absolute right-2.5 pointer-events-none" />
        </div>

        {/* Status filter */}
        <div className="relative flex items-center">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)} className={selectClass}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">In-Progress</option>
            <option value="completed">Complete</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#F8F6F0]/40 absolute right-2.5 pointer-events-none" />
        </div>

        {/* Genre filter */}
        {genres.length > 1 && (
          <div className="relative flex items-center">
            <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} className={selectClass}>
              <option value="">All Genres</option>
              {genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#F8F6F0]/40 absolute right-2.5 pointer-events-none" />
          </div>
        )}

        {/* Tone filter */}
        {tones.length > 1 && (
          <div className="relative flex items-center">
            <select value={filterTone} onChange={e => setFilterTone(e.target.value)} className={selectClass}>
              <option value="">All Tones</option>
              {tones.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#F8F6F0]/40 absolute right-2.5 pointer-events-none" />
          </div>
        )}

        {/* New Story */}
        <Button onClick={() => dispatch({ type: 'SET_STEP', payload: 'setup' })} className="shrink-0 h-10">
          <Plus className="w-4 h-4" /> New Story
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-base">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 text-[#F8F6F0]/30">
          <Wand2 className="w-16 h-16 mx-auto mb-5 opacity-20" />
          <p className="font-medium text-[#F8F6F0]/50 text-xl mb-2">
            {projects.length === 0 ? 'No stories yet' : 'No stories match your filters'}
          </p>
          <p className="text-base">
            {projects.length === 0
              ? 'Click "New Story" to forge your first narrative.'
              : 'Try adjusting your search or filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(p => {
            const s = stats[p.id]
            const progress = s ? Math.min(100, Math.round((s.sceneCount / 20) * 100)) : 0
            return (
              <div
                key={p.id}
                onClick={() => onViewDetail?.(p)}
                className="group bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-6 hover:border-[#F5A623]/50 hover:bg-[#2D2D5E]/60 transition-all flex flex-col gap-4 cursor-pointer"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="gold" className="text-xs">{p.genre}</Badge>
                  </div>
                  <span className="text-xs text-[#F8F6F0]/30 flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> {formatDate(p.updated_at)}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h3 className="font-bold text-[#F8F6F0] text-xl leading-snug group-hover:text-[#F5A623] transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-[#F8F6F0]/40 text-sm mt-1">{p.tone}</p>
                </div>

                {/* Stats */}
                {s ? (
                  <div className="flex flex-wrap gap-4">
                    <StatPill icon={Film}      value={s.sceneCount}     label="scenes" />
                    <StatPill icon={Users}     value={s.characterCount} label="chars" />
                    <StatPill icon={GitBranch} value={s.branchCount}    label="branches" />
                    <StatPill icon={Trophy}    value={s.endingCount}    label="endings" />
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {[64, 48, 56, 40].map(w => (
                      <div key={w} className="h-4 rounded-full bg-[#3D3D7A]/60 animate-pulse" style={{ width: w }} />
                    ))}
                  </div>
                )}

                {/* Progress */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-[#3D3D7A]/40 rounded-full overflow-hidden">
                    <div className="h-full bg-[#F5A623]/70 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-[#F8F6F0]/30 shrink-0 w-8 text-right">{progress}%</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1 text-sm"
                    loading={resuming === p.id}
                    onClick={() => handleResume(p.id)}
                  >
                    Resume →
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
