import { useEffect, useState } from 'react'
import {
  loadProjectSetup,
  loadCharacters,
  loadCharacterGuardrails,
  addCharacterGuardrail,
  removeCharacterGuardrail,
  loadScenes,
  loadChoicesForScene,
  loadStoryState,
  listBranches,
  loadScenesByBranch,
} from '@/services/storyService'
import { useStory } from '@/contexts/StoryContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GitBranchMap } from './GitBranchMap'
import { PlayStep } from '@/components/play/PlayStep'
import { ScenesTab } from '@/components/play/ScenesTab'
import type { Character, CharacterGuardrail, Choice, ProjectSetup, Scene } from '@/types/story'
import {
  ArrowLeft, Users, GitBranch, Shield, BookOpen,
  ChevronDown, ChevronRight, Trash2, Plus, User,
  AlertTriangle, Settings, Film, Hash, Wand2, List,
} from 'lucide-react'

interface Props {
  project: { id: string; title: string; genre: string; tone: string; status: string }
  onBack: () => void
}

type Tab = 'overview' | 'characters' | 'play' | 'scenes' | 'branches' | 'guardrails' | 'settings'

// ── Character Detail Modal ────────────────────────────────────────────────────
function CharacterModal({
  char, guardrails, projectId, onClose, onGuardrailAdded, onGuardrailRemoved,
}: {
  char: Character
  guardrails: CharacterGuardrail[]
  projectId: string
  onClose: () => void
  onGuardrailAdded: (g: CharacterGuardrail) => void
  onGuardrailRemoved: (id: string) => void
}) {
  const [newRule, setNewRule] = useState('')
  const [saving, setSaving] = useState(false)
  const charGuardrails = guardrails.filter(g => g.characterId === char.id)

  const handleAdd = async () => {
    if (!newRule.trim() || !char.id) return
    setSaving(true)
    try {
      const g = await addCharacterGuardrail(projectId, char.id, newRule.trim())
      onGuardrailAdded(g)
      setNewRule('')
    } catch { /* silently fail */ }
    finally { setSaving(false) }
  }

  const handleRemove = async (id: string) => {
    try { await removeCharacterGuardrail(id); onGuardrailRemoved(id) }
    catch { /* ignore */ }
  }

  const roleColor = char.role === 'protagonist' ? '#F5A623' : char.role === 'antagonist' ? '#f87171' : char.role === 'minor' ? '#60a5fa' : '#94a3b8'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-6 border-b border-[#3D3D7A]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: `${roleColor}22`, border: `2px solid ${roleColor}` }}>
              <span style={{ color: roleColor }}>{char.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h3 className="font-bold text-[#F8F6F0] text-lg">{char.name}</h3>
              <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'} className="text-xs capitalize mt-0.5">
                {char.role}
              </Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-[#F8F6F0]/40 hover:text-[#F8F6F0] cursor-pointer text-xl leading-none">×</button>
        </div>
        <div className="p-6 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">
          <div>
            <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-2">Description</p>
            <p className="text-base text-[#F8F6F0]/80 leading-relaxed">{char.description || '—'}</p>
          </div>
          {char.biography && (
            <div>
              <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-2">Biography</p>
              <p className="text-base text-[#F8F6F0]/70 leading-relaxed">{char.biography}</p>
            </div>
          )}
          {char.traits.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-2">Traits</p>
              <div className="flex flex-wrap gap-2">
                {char.traits.map(t => <Badge key={t} variant="gold" className="text-sm">{t}</Badge>)}
              </div>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#F5A623]" /> Character Guardrails
            </p>
            <div className="flex flex-col gap-2 mb-3">
              {charGuardrails.length === 0 && (
                <p className="text-sm text-[#F8F6F0]/30 italic">No guardrails set for this character.</p>
              )}
              {charGuardrails.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-[#F5A623]/60 shrink-0" />
                  <span className="flex-1 text-sm text-[#F8F6F0]/70">{g.rule}</span>
                  <button onClick={() => handleRemove(g.id)} className="text-[#F8F6F0]/25 hover:text-red-400 transition-colors cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 rounded-xl bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0] text-sm placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40"
                placeholder={`e.g. "${char.name} must never betray allies"`}
                value={newRule}
                onChange={e => setNewRule(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <Button size="sm" loading={saving} onClick={handleAdd} disabled={!newRule.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Characters Tab ────────────────────────────────────────────────────────────
function CharactersTab({
  characters, guardrails, projectId, onGuardrailAdded, onGuardrailRemoved,
}: {
  characters: Character[]
  guardrails: CharacterGuardrail[]
  projectId: string
  onGuardrailAdded: (g: CharacterGuardrail) => void
  onGuardrailRemoved: (id: string) => void
}) {
  const [selected, setSelected] = useState<Character | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const roleOrder: Record<string, number> = { protagonist: 0, antagonist: 1, supporting: 2, minor: 3 }
  const sorted = [...characters].sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3))

  const roleColor = (role: string) =>
    role === 'protagonist' ? '#F5A623' : role === 'antagonist' ? '#f87171' : role === 'minor' ? '#60a5fa' : '#94a3b8'

  return (
    <div className="flex flex-col gap-4">
      {characters.length === 0 && (
        <p className="text-[#F8F6F0]/30 text-lg text-center py-12">No characters found.</p>
      )}
      {sorted.map(char => {
        const charGuardrails = guardrails.filter(g => g.characterId === char.id)
        const isExpanded = expandedId === char.id
        return (
          <div key={char.id} className="border border-[#3D3D7A] rounded-2xl overflow-hidden bg-[#1A1A3E]/50">
            <div className="flex items-stretch hover:bg-[#2D2D5E]/50 transition-colors">
              <button
                type="button"
                className="flex-1 flex items-center gap-4 px-5 py-4 cursor-pointer text-left"
                onClick={() => setExpandedId(isExpanded ? null : (char.id ?? null))}
                aria-expanded={isExpanded}
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                  style={{ backgroundColor: `${roleColor(char.role)}22`, border: `2px solid ${roleColor(char.role)}` }}>
                  <span style={{ color: roleColor(char.role) }}>{char.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-[#F8F6F0] text-base truncate">{char.name}</p>
                    <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'} className="text-xs capitalize shrink-0">
                      {char.role}
                    </Badge>
                    {charGuardrails.length > 0 && (
                      <Badge variant="warning" className="text-xs shrink-0">
                        <Shield className="w-3 h-3 mr-1" />{charGuardrails.length}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-[#F8F6F0]/40 truncate mt-0.5">{char.description}</p>
                </div>
                {isExpanded ? <ChevronDown className="w-5 h-5 text-[#F8F6F0]/30" /> : <ChevronRight className="w-5 h-5 text-[#F8F6F0]/30" />}
              </button>
              <button
                type="button"
                onClick={() => setSelected(char)}
                className="self-center mr-5 p-2 rounded-xl border border-[#3D3D7A] text-[#F8F6F0]/40 hover:text-[#F5A623] hover:border-[#F5A623]/40 transition-colors cursor-pointer"
                title="View full details"
                aria-label={`View full details for ${char.name}`}
              >
                <User className="w-4 h-4" />
              </button>
            </div>

            {isExpanded && (
              <div className="px-5 pb-5 border-t border-[#3D3D7A]/50 pt-4 flex flex-col gap-3">
                {char.traits.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {char.traits.map(t => <Badge key={t} variant="gold" className="text-sm">{t}</Badge>)}
                  </div>
                )}
                {charGuardrails.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {charGuardrails.map(g => (
                      <div key={g.id} className="flex items-center gap-2 text-sm text-amber-400/70">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        {g.rule}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {selected && (
        <CharacterModal
          char={selected}
          guardrails={guardrails}
          projectId={projectId}
          onClose={() => setSelected(null)}
          onGuardrailAdded={onGuardrailAdded}
          onGuardrailRemoved={onGuardrailRemoved}
        />
      )}
    </div>
  )
}

// ── Story Guardrails Tab ──────────────────────────────────────────────────────
function GuardrailsTab({ guardrails }: { guardrails: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      {guardrails.length === 0 && (
        <p className="text-[#F8F6F0]/30 text-lg text-center py-12">No story-level guardrails set.</p>
      )}
      {guardrails.map((g, i) => (
        <div key={i} className="flex items-start gap-3 p-4 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-2xl">
          <Shield className="w-5 h-5 text-[#F5A623] shrink-0 mt-0.5" />
          <p className="text-base text-[#F8F6F0]/80 leading-relaxed">{g}</p>
        </div>
      ))}
    </div>
  )
}

// ── Project Settings Tab ──────────────────────────────────────────────────────
function ProjectSettingsTab({ project }: { project: { id: string; title: string; genre: string; tone: string } }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col divide-y divide-[#3D3D7A]/50">
        {[
          { label: 'Project ID', value: project.id },
          { label: 'Genre',      value: project.genre },
          { label: 'Tone',       value: project.tone },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between py-4">
            <span className="text-base text-[#F8F6F0]/40">{label}</span>
            <span className="text-base text-[#F8F6F0]/70 font-mono truncate max-w-xs">{value}</span>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-[#3D3D7A]">
        <p className="text-base font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Danger Zone</p>
        <p className="text-sm text-[#F8F6F0]/30 mb-4">Destructive actions cannot be undone.</p>
        <Button variant="ghost" size="md" className="text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40" disabled>
          Delete Project
        </Button>
      </div>
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({
  setup, scenes, characters, guardrails,
}: {
  setup: ProjectSetup | null
  scenes: Scene[]
  characters: Character[]
  guardrails: CharacterGuardrail[]
}) {
  if (!setup) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 rounded-full border-4 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
    </div>
  )

  const wordCount = scenes.reduce((n, s) => n + s.content.split(/\s+/).filter(Boolean).length, 0)
  const endingCount = scenes.filter(s => s.isEnding).length
  const lastUpdated = scenes.length > 0
    ? new Date(Math.max(...scenes.map(s => new Date(s.createdAt).getTime()))).toLocaleDateString()
    : '—'

  const stats = [
    { icon: Film,   label: 'Scenes',     value: scenes.length },
    { icon: Hash,   label: 'Words',      value: wordCount.toLocaleString() },
    { icon: GitBranch, label: 'Branches', value: characters.length },
    { icon: BookOpen,  label: 'Last Updated', value: lastUpdated },
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">
      {/* ── Left Panel ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="w-4 h-4 text-[#F5A623]/70" />
                <span className="text-sm text-[#F8F6F0]/40 uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-3xl font-bold text-[#F8F6F0]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Synopsis */}
        <div>
          <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Synopsis / Setting</p>
          <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-5">
            <p className="text-base text-[#F8F6F0]/80 leading-relaxed">
              {setup.setting || <span className="text-[#F8F6F0]/25 italic">No synopsis provided.</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Panel ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* Details */}
        <div>
          <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Details</p>
          <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-5">
            <div className="flex flex-col divide-y divide-[#3D3D7A]/40">
              {[
                { label: 'Genre',       value: setup.genre },
                { label: 'Tone',        value: setup.tone },
                { label: 'Characters',  value: `${characters.length}` },
                { label: 'Guardrails',  value: `${setup.guardrails.length + guardrails.length}` },
                { label: 'Endings',     value: `${endingCount}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3">
                  <span className="text-sm text-[#F8F6F0]/40">{label}</span>
                  <span className="text-base font-medium text-[#F8F6F0]/80">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Current summary / Characters preview */}
        <div>
          <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Characters</p>
          <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-5">
            {characters.length === 0 ? (
              <p className="text-sm text-[#F8F6F0]/25 italic">No characters yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {characters.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-xl">
                    <span className="text-sm font-medium text-[#F8F6F0]">{c.name}</span>
                    <Badge variant={c.role === 'protagonist' ? 'gold' : c.role === 'antagonist' ? 'danger' : 'default'} className="text-xs capitalize">
                      {c.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ProjectDetailPage ────────────────────────────────────────────────────
export function ProjectDetailPage({ project, onBack }: Props) {
  const { state, dispatch } = useStory()

  const [tab, setTab] = useState<Tab>('overview')
  const [setup, setSetup] = useState<ProjectSetup | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [guardrails, setGuardrails] = useState<CharacterGuardrail[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [resuming, setResuming] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)

  useEffect(() => {
    setLoadingData(true)
    setLoadError(null)
    setPlayerReady(false)
    Promise.all([
      loadProjectSetup(project.id),
      loadCharacters(project.id),
      loadCharacterGuardrails(project.id),
      loadScenes(project.id),
    ])
      .then(([s, c, g, sc]) => {
        setSetup(s)
        setCharacters(c)
        setGuardrails(g)
        setScenes(sc)
      })
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Failed to load project data'))
      .finally(() => setLoadingData(false))
  }, [project.id])

  const hydratePlayer = async () => {
    if (playerReady && state.projectId === project.id) return

    setResuming(true)
    setLoadError(null)
    try {
      const [projectSetup, branches, storyState] = await Promise.all([
        setup ? Promise.resolve(setup) : loadProjectSetup(project.id),
        listBranches(project.id),
        loadStoryState(project.id),
      ])
      const activeBranch = branches.find(branch => branch.isActive)
        ?? branches.find(branch => branch.name === 'main')
        ?? branches[0]
      const projectScenes = activeBranch
        ? await loadScenesByBranch(project.id, activeBranch.id)
        : await loadScenes(project.id)

      dispatch({ type: 'SET_PROJECT', payload: { projectId: project.id, setup: projectSetup } })
      dispatch({ type: 'SET_BRANCH', payload: activeBranch?.id ?? null })

      let currentChoices: Choice[] = []
      if (projectScenes.length > 0) {
        currentChoices = await loadChoicesForScene(projectScenes[projectScenes.length - 1].id)
      }
      dispatch({ type: 'LOAD_HISTORY', payload: { scenes: projectScenes, currentChoices } })
      if (storyState) dispatch({ type: 'SET_STORY_STATE', payload: storyState })
      setPlayerReady(true)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load story player')
      throw error
    } finally {
      setResuming(false)
    }
  }

  const openStoryTab = async (nextTab: 'play' | 'scenes') => {
    setTab(nextTab)
    try {
      await hydratePlayer()
    } catch {
      // The tab displays loadError.
    }
  }

  const handleResume = async () => {
    try {
      await hydratePlayer()
      dispatch({ type: 'SET_STEP', payload: 'play' })
    } catch {
      // Stay on the details page and show the error.
    }
  }

  const sceneCount = playerReady && state.projectId === project.id
    ? state.scenes.length
    : scenes.length

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'characters', label: `Characters${characters.length > 0 ? ` (${characters.length})` : ''}`, icon: Users },
    { id: 'play', label: 'Play', icon: Wand2 },
    { id: 'scenes', label: `Scenes${sceneCount > 0 ? ` (${sceneCount})` : ''}`, icon: List },
    { id: 'branches', label: 'Branches', icon: GitBranch },
    { id: 'guardrails', label: 'Guardrails', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="w-full min-h-screen bg-[#1A1A3E] flex flex-col">
      <div className="flex items-center justify-between gap-4 px-10 py-6 border-b border-[#3D3D7A] shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#F8F6F0]/50 hover:text-[#F8F6F0] transition-colors cursor-pointer shrink-0 text-base"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="w-px h-6 bg-[#3D3D7A]" />
          <h1 className="text-2xl font-bold text-[#F8F6F0] truncate">{project.title}</h1>
        </div>
        <Button size="md" loading={resuming} onClick={handleResume}>
          Resume Story →
        </Button>
      </div>

      <div className="flex border-b border-[#3D3D7A] shrink-0 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => id === 'play' || id === 'scenes' ? void openStoryTab(id) : setTab(id)}
            className={`min-w-fit flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
              tab === id
                ? 'border-[#F5A623] text-[#F5A623] bg-[#F5A623]/5'
                : 'border-transparent text-[#F8F6F0]/40 hover:text-[#F8F6F0]/70 hover:bg-[#2D2D5E]/30'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className={`flex-1 overflow-y-auto ${tab === 'play' || tab === 'scenes' ? '' : 'px-10 py-8'}`}>
        {loadingData || ((tab === 'play' || tab === 'scenes') && resuming && !playerReady) ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
          </div>
        ) : loadError ? (
          <div className="m-8 p-5 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-400 text-base">
            {loadError}
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <OverviewTab setup={setup} scenes={playerReady ? state.scenes : scenes} characters={characters} guardrails={guardrails} />
            )}
            {tab === 'characters' && (
              <CharactersTab
                characters={characters}
                guardrails={guardrails}
                projectId={project.id}
                onGuardrailAdded={g => setGuardrails(prev => [...prev, g])}
                onGuardrailRemoved={id => setGuardrails(prev => prev.filter(g => g.id !== id))}
              />
            )}
            {tab === 'play' && playerReady && (
              <PlayStep onViewStoryMap={() => setTab('branches')} />
            )}
            {tab === 'scenes' && playerReady && (
              <ScenesTab onOpenScene={() => setTab('play')} onPlay={() => setTab('play')} />
            )}
            {tab === 'branches' && (
              <GitBranchMap scenes={playerReady ? state.scenes : scenes} onRestore={() => {}} />
            )}
            {tab === 'guardrails' && <GuardrailsTab guardrails={setup?.guardrails ?? []} />}
            {tab === 'settings' && <ProjectSettingsTab project={project} />}
          </>
        )}
      </div>
    </div>
  )
}
