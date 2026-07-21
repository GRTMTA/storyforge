import { useEffect, useState, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStory } from '@/contexts/StoryContext'
import {
  listProjects,
  loadProjectStats,
  loadProjectSetup,
  loadScenes,
  loadChoicesForScene,
  loadStoryState,
  exportStoryAsText,
  deleteProject,
} from '@/services/storyService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Plus, Clock, Wand2, GitBranch, Film, Search,
  ChevronDown, MoreVertical, Trash2, Download, Eye,
} from 'lucide-react'
import type { ProjectStats } from '@/types/story'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProjectRow {
  id: string
  title: string
  genre: string
  tone: string
  status: string
  created_at: string
  updated_at: string
}

type SortOption = 'alpha-asc' | 'alpha-desc' | 'newest' | 'oldest' | 'most-scenes'
type FilterStatus = 'all' | 'draft' | 'active' | 'completed'

// Maps DB status → display label & badge styling
const STATUS_META: Record<string, { label: string; variant: 'default' | 'gold' | 'success' | 'warning' | 'danger'; dot: string }> = {
  setup:     { label: 'Draft',       variant: 'default',  dot: '#9ca3af' },
  active:    { label: 'In-Progress', variant: 'warning',  dot: '#60a5fa' },
  completed: { label: 'Complete',    variant: 'success',  dot: '#fbbf24' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffH  = Math.floor(diffMs / 36e5)
  if (diffH < 1)      return 'Just now'
  if (diffH < 24)     return `Updated ${diffH}h ago`
  if (diffH < 24 * 7) return `Updated ${Math.floor(diffH / 24)}d ago`
  return `Updated ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

// ── ContextMenu ───────────────────────────────────────────────────────────────

interface MenuAction { label: string; icon: React.ElementType; danger?: boolean; onClick: () => void }

function ContextMenu({ actions, onClose }: { actions: MenuAction[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-[#1A1A3E] border border-[#3D3D7A] rounded-xl shadow-xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {actions.map(({ label, icon: Icon, danger, onClick }) => (
        <button
          key={label}
          onClick={() => { onClick(); onClose() }}
          className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
            danger
              ? 'text-red-400 hover:bg-red-500/15'
              : 'text-[#F8F6F0]/70 hover:bg-[#2D2D5E]/80 hover:text-[#F8F6F0]'
          }`}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  )
}

// ── StoryCard ─────────────────────────────────────────────────────────────────

interface StoryCardProps {
  project: ProjectRow
  stats: ProjectStats | undefined
  resuming: boolean
  onResume: () => void
  onViewDetail: () => void
  onDelete: () => void
  onExport: () => void
}

function StoryCard({
  project: p,
  stats: s,
  resuming,
  onResume,
  onViewDetail,
  onDelete,
  onExport,
}: StoryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const statusMeta = STATUS_META[p.status] ?? STATUS_META.setup

  const menuActions: MenuAction[] = [
    { label: 'View Details', icon: Eye,      onClick: onViewDetail },
    { label: 'Export Story',  icon: Download, onClick: onExport    },
    { label: 'Delete Story',  icon: Trash2,   danger: true, onClick: onDelete },
  ]

  return (
    <article
      onClick={onViewDetail}
      className="group relative flex flex-col gap-0 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl overflow-hidden cursor-pointer
        hover:border-[#F5A623]/40 hover:bg-[#2D2D5E]/60 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        transition-all duration-200"
    >
      {/* ── Row 1: Title & Status ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <h3 className="font-bold text-[#F8F6F0] text-lg leading-snug group-hover:text-[#F5A623] transition-colors line-clamp-2 flex-1">
          {p.title}
        </h3>
        <span className="shrink-0 flex items-center gap-1.5 mt-0.5">
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: statusMeta.dot }}
          />
          <Badge variant={statusMeta.variant} className="text-xs whitespace-nowrap">
            {statusMeta.label}
          </Badge>
        </span>
      </div>

      {/* ── Row 2: Genre · Tone ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 pb-3">
        <Badge variant="gold" className="text-xs">{p.genre}</Badge>
        <span className="text-[#F8F6F0]/25 text-xs">·</span>
        <span className="text-[#F8F6F0]/40 text-xs">{p.tone}</span>
      </div>

      {/* ── Row 3: Quick Stats ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 pb-4 flex-wrap">
        {s ? (
          <>
            <span className="flex items-center gap-1 text-[#F8F6F0]/50 text-xs">
              <Film      className="w-3 h-3 text-[#F5A623]/50" />
              <span className="font-semibold text-[#F8F6F0]/70">{s.sceneCount}</span> scenes
            </span>
            <span className="text-[#F8F6F0]/20 text-xs">·</span>
            <span className="flex items-center gap-1 text-[#F8F6F0]/50 text-xs">
              <Clock     className="w-3 h-3 text-[#F5A623]/50" />
              {formatDate(p.updated_at)}
            </span>
            <span className="text-[#F8F6F0]/20 text-xs">·</span>
            <span className="flex items-center gap-1 text-[#F8F6F0]/50 text-xs">
              <GitBranch className="w-3 h-3 text-[#F5A623]/50" />
              <span className="font-semibold text-[#F8F6F0]/70">{s.branchCount}</span> branches
            </span>
          </>
        ) : (
          <div className="flex gap-2">
            {[56, 80, 60].map(w => (
              <div key={w} className="h-3 rounded-full bg-[#3D3D7A]/60 animate-pulse" style={{ width: w }} />
            ))}
          </div>
        )}
      </div>

      {/* ── Progress bar (optional visual) ───────────────────────────────── */}
      {s && (
        <div className="h-0.5 bg-[#3D3D7A]/30 mx-5 mb-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F5A623]/60 rounded-full transition-all"
            style={{ width: `${Math.min(100, Math.round((s.sceneCount / 20) * 100))}%` }}
          />
        </div>
      )}

      {/* ── Row 4: Actions ────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-5 py-4 border-t border-[#3D3D7A]/60 mt-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Continue (primary) */}
        <Button
          variant="primary"
          size="sm"
          className="flex-1 text-sm"
          loading={resuming}
          onClick={onResume}
        >
          Continue →
        </Button>

        {/* View Details (secondary) */}
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 text-sm"
          onClick={onViewDetail}
        >
          View Details
        </Button>

        {/* More / ⋮ menu */}
        <div className="relative">
          <button
            title="More options"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#F8F6F0]/40 hover:text-[#F8F6F0]/80 hover:bg-[#2D2D5E]/80 border border-[#3D3D7A] transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <ContextMenu actions={menuActions} onClose={() => setMenuOpen(false)} />
          )}
        </div>
      </div>
    </article>
  )
}

// ── StoriesTab ────────────────────────────────────────────────────────────────

interface StoryCardData {
  id: string
  title: string
  genre: string
  tone: string
  status: string
  created_at: string
  updated_at: string
}

export function StoriesTab({ onViewDetail }: { onViewDetail?: (p: StoryCardData) => void }) {
  const { user } = useAuth()
  const { dispatch } = useStory()
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [stats,    setStats]    = useState<Record<string, ProjectStats>>({})
  const [loading,  setLoading]  = useState(true)
  const [resuming, setResuming] = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  // Controls
  const [search,       setSearch]       = useState('')
  const [sort,         setSort]         = useState<SortOption>('newest')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterGenre,  setFilterGenre]  = useState('')
  const [filterTone,   setFilterTone]   = useState('')

  const [confirmDelete, setConfirmDelete] = useState<ProjectRow | null>(null)
  const [deleting,      setDeleting]      = useState(false)

  // ── Data loading ─────────────────────────────────────────────────────────
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

  // ── Actions ───────────────────────────────────────────────────────────────
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

  const handleExport = async (p: ProjectRow) => {
    try {
      const text = await exportStoryAsText(p.id, p.title)
      const blob = new Blob([text], { type: 'text/markdown' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `${p.title.replace(/\s+/g, '_')}.md`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    }
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteProject(confirmDelete.id)
      setProjects(prev => prev.filter(p => p.id !== confirmDelete.id))
      setStats(prev => { const n = { ...prev }; delete n[confirmDelete.id]; return n })
      setConfirmDelete(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete project')
    } finally {
      setDeleting(false)
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const genres = useMemo(() => [...new Set(projects.map(p => p.genre))].sort(), [projects])
  const tones  = useMemo(() => [...new Set(projects.map(p => p.tone))].sort(),  [projects])

  const filtered = useMemo(() => {
    let list = [...projects]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title.toLowerCase().includes(q))
    }
    if (filterStatus !== 'all') {
      const map: Record<FilterStatus, string> = { all: '', draft: 'setup', active: 'active', completed: 'completed' }
      list = list.filter(p => p.status === map[filterStatus])
    }
    if (filterGenre) list = list.filter(p => p.genre === filterGenre)
    if (filterTone)  list = list.filter(p => p.tone  === filterTone)
    list.sort((a, b) => {
      switch (sort) {
        case 'alpha-asc':   return a.title.localeCompare(b.title)
        case 'alpha-desc':  return b.title.localeCompare(a.title)
        case 'newest':      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        case 'oldest':      return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        case 'most-scenes': return (stats[b.id]?.sceneCount ?? 0) - (stats[a.id]?.sceneCount ?? 0)
        default:            return 0
      }
    })
    return list
  }, [projects, search, filterStatus, filterGenre, filterTone, sort, stats])

  const selectClass =
    'h-10 px-3 pr-8 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm focus:outline-none focus:border-[#F5A623]/50 cursor-pointer appearance-none'

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="px-6 md:px-10 py-10 w-full">

      {/* Header */}
      <div className="text-center mb-3">
        <h1 className="text-4xl font-bold text-[#F8F6F0]">My Stories</h1>
        <p className="text-[#F8F6F0]/50 text-lg mt-2">
          {projects.length === 0
            ? 'No stories yet — create one to begin'
            : `${projects.length} ${projects.length === 1 ? 'story' : 'stories'} in your collection`}
        </p>
      </div>

      {/* Controls */}
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

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Card grid */}
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
          {filtered.map(p => (
            <StoryCard
              key={p.id}
              project={p}
              stats={stats[p.id]}
              resuming={resuming === p.id}
              onResume={() => handleResume(p.id)}
              onViewDetail={() => onViewDetail?.(p)}
              onDelete={() => setConfirmDelete(p)}
              onExport={() => handleExport(p)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !deleting && setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#F8F6F0] mb-2">Delete Story?</h3>
            <p className="text-[#F8F6F0]/60 text-sm mb-6 leading-relaxed">
              <span className="text-[#F8F6F0]/90 font-semibold">"{confirmDelete.title}"</span> and all its
              scenes, characters, and branches will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="md"
                className="flex-1"
                disabled={deleting}
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                className="flex-1"
                loading={deleting}
                onClick={handleDeleteConfirmed}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
