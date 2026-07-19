import { useEffect, useState } from 'react'
import {
  loadProjectSetup,
  loadCharacters,
  loadCharacterGuardrails,
  addCharacterGuardrail,
  removeCharacterGuardrail,
  loadScenes,
} from '@/services/storyService'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GitBranchMap } from './GitBranchMap'
import type { Character, CharacterGuardrail, ProjectSetup, Scene } from '@/types/story'
import {
  X, Users, GitBranch, Shield, BookOpen, ChevronDown, ChevronRight,
  Trash2, Plus, User, AlertTriangle, Settings,
} from 'lucide-react'

interface Props {
  project: { id: string; title: string; genre: string; tone: string }
  onClose: () => void
}

type Tab = 'overview' | 'characters' | 'branches' | 'guardrails' | 'settings'

// ── Character Detail Modal ────────────────────────────────────────────────────
function CharacterModal({
  char,
  guardrails,
  projectId,
  onClose,
  onGuardrailAdded,
  onGuardrailRemoved,
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
    } catch {
      // silently fail – user sees no change
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await removeCharacterGuardrail(id)
      onGuardrailRemoved(id)
    } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#3D3D7A]">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
              char.role === 'protagonist' ? 'bg-[#F5A623]/20 text-[#F5A623]' :
              char.role === 'antagonist' ? 'bg-red-500/20 text-red-400' :
              'bg-[#3D3D7A]/60 text-[#F8F6F0]/60'
            }`}>
              {char.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-[#F8F6F0]">{char.name}</h3>
              <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'} className="text-[10px]">
                {char.role}
              </Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-[#F8F6F0]/40 hover:text-[#F8F6F0] cursor-pointer"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
          {/* Description */}
          <div>
            <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-sm text-[#F8F6F0]/80 leading-relaxed">{char.description || '—'}</p>
          </div>

{/* Traits */}
          {char.traits.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-1.5">Traits</p>
              <div className="flex flex-wrap gap-1.5">
                {char.traits.map(t => <Badge key={t} variant="gold" className="text-[10px]">{t}</Badge>)}
              </div>
            </div>
          )}

          {/* Character Guardrails */}
          <div>
            <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#F5A623]" /> Character Guardrails
            </p>
            <div className="flex flex-col gap-1.5 mb-2">
              {charGuardrails.length === 0 && (
                <p className="text-xs text-[#F8F6F0]/30 italic">No guardrails set for this character.</p>
              )}
              {charGuardrails.map(g => (
                <div key={g.id} className="flex items-center gap-2 p-2 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-lg">
                  <AlertTriangle className="w-3 h-3 text-[#F5A623]/60 shrink-0" />
                  <span className="flex-1 text-xs text-[#F8F6F0]/70">{g.rule}</span>
                  <button onClick={() => handleRemove(g.id)} className="text-[#F8F6F0]/25 hover:text-red-400 transition-colors cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0] text-xs placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-1 focus:ring-[#F5A623]/40"
                placeholder={`e.g. "${char.name} must never betray allies"`}
                value={newRule}
                onChange={e => setNewRule(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
              <Button size="sm" loading={saving} onClick={handleAdd} disabled={!newRule.trim()}>
                <Plus className="w-3 h-3" />
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
  characters,
  guardrails,
  projectId,
  onGuardrailAdded,
  onGuardrailRemoved,
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

  return (
    <div className="flex flex-col gap-3">
      {characters.length === 0 && (
        <p className="text-[#F8F6F0]/30 text-sm text-center py-8">No characters found.</p>
      )}
      {sorted.map(char => {
        const charGuardrails = guardrails.filter(g => g.characterId === char.id)
        const isExpanded = expandedId === char.id
        return (
          <div key={char.id} className="border border-[#3D3D7A] rounded-xl overflow-hidden bg-[#1A1A3E]/50">
            {/* Row header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#2D2D5E]/50 transition-colors cursor-pointer text-left"
              onClick={() => setExpandedId(isExpanded ? null : (char.id ?? null))}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                char.role === 'protagonist' ? 'bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]/30' :
                char.role === 'antagonist' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                'bg-[#3D3D7A]/60 text-[#F8F6F0]/60 border border-[#3D3D7A]'
              }`}>
                {char.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[#F8F6F0] text-sm truncate">{char.name}</p>
                  <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'} className="text-[10px] shrink-0">
                    {char.role}
                  </Badge>
                  {charGuardrails.length > 0 && (
                    <Badge variant="warning" className="text-[10px] shrink-0">
                      <Shield className="w-2.5 h-2.5 mr-0.5" />{charGuardrails.length}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-[#F8F6F0]/40 truncate mt-0.5">{char.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); setSelected(char) }}
                  className="p-1.5 rounded-lg border border-[#3D3D7A] text-[#F8F6F0]/40 hover:text-[#F5A623] hover:border-[#F5A623]/40 transition-colors cursor-pointer"
                  title="View full details"
                >
                  <User className="w-3.5 h-3.5" />
                </button>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-[#F8F6F0]/30" /> : <ChevronRight className="w-4 h-4 text-[#F8F6F0]/30" />}
              </div>
            </button>

            {/* Expanded traits + backstory preview */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-[#3D3D7A]/50 pt-3 flex flex-col gap-2">
                {char.traits.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {char.traits.map(t => <Badge key={t} variant="gold" className="text-[10px]">{t}</Badge>)}
                  </div>
                )}
                {charGuardrails.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {charGuardrails.map(g => (
                      <div key={g.id} className="flex items-center gap-1.5 text-xs text-amber-400/70">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
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
    <div className="flex flex-col gap-2">
      {guardrails.length === 0 && (
        <p className="text-[#F8F6F0]/30 text-sm text-center py-8">No story-level guardrails set.</p>
      )}
      {guardrails.map((g, i) => (
        <div key={i} className="flex items-start gap-2.5 p-3 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-xl">
          <Shield className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
          <p className="text-sm text-[#F8F6F0]/80 leading-relaxed">{g}</p>
        </div>
      ))}
    </div>
  )
}

// ── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ project }: { project: { id: string; title: string; genre: string; tone: string } }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="p-4 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl">
        <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Project Info</p>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Project ID', value: project.id },
            { label: 'Genre',      value: project.genre },
            { label: 'Tone',       value: project.tone },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-[#F8F6F0]/40">{label}</span>
              <span className="text-xs text-[#F8F6F0]/70 font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl">
        <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-2">Danger Zone</p>
        <p className="text-xs text-[#F8F6F0]/30 mb-3">Destructive actions cannot be undone.</p>
        <Button variant="ghost" size="sm" className="text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40" disabled>
          Delete Project
        </Button>
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export function ProjectDetailDrawer({ project, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [setup, setSetup] = useState<ProjectSetup | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [guardrails, setGuardrails] = useState<CharacterGuardrail[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    let done = 0
    const finish = () => { done++; if (done === 4) setLoadingData(false) }

    loadProjectSetup(project.id)
      .then(s => setSetup(s)).catch(() => {/* keep null */}).finally(finish)
    loadCharacters(project.id)
      .then(c => setCharacters(c)).catch(() => setCharacters([])).finally(finish)
    loadCharacterGuardrails(project.id)
      .then(g => setGuardrails(g)).catch(() => setGuardrails([])).finally(finish)
    loadScenes(project.id)
      .then(sc => setScenes(sc)).catch(() => setScenes([])).finally(finish)
  }, [project.id])

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',    label: 'Overview',                                                           icon: BookOpen  },
    { id: 'characters',  label: `Characters${characters.length > 0 ? ` (${characters.length})` : ''}`, icon: Users    },
    { id: 'branches',    label: `Branches${scenes.length > 0 ? ` (${scenes.length})` : ''}`,          icon: GitBranch },
    { id: 'guardrails',  label: 'Guardrails',                                                          icon: Shield    },
    { id: 'settings',    label: 'Settings',                                                            icon: Settings  },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      {/* Modal */}
      <div
        className="w-[75vw] h-[75vh] min-w-[320px] min-h-[400px] bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[#3D3D7A] shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="gold" className="text-[10px]">{project.genre}</Badge>
              <Badge variant="default" className="text-[10px]">{project.tone}</Badge>
            </div>
            <h2 className="text-xl font-bold text-[#F8F6F0] truncate">{project.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#F8F6F0]/40 hover:text-[#F8F6F0] hover:bg-[#2D2D5E] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 py-2 border-b border-[#3D3D7A] shrink-0 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                tab === id
                  ? 'bg-[#F5A623] text-[#1A1A3E]'
                  : 'text-[#F8F6F0]/50 hover:text-[#F8F6F0] hover:bg-[#2D2D5E]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loadingData ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 rounded-full border-3 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
            </div>
          ) : (
            <>
              {tab === 'overview' && setup && (
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-2">Setting</p>
                    <p className="text-sm text-[#F8F6F0]/80 leading-relaxed bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl p-3">{setup.setting || '—'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Scenes', value: scenes.length },
                      { label: 'Characters', value: characters.length },
                      { label: 'Guardrails', value: setup.guardrails.length + guardrails.length },
                      { label: 'Endings', value: scenes.filter(s => s.isEnding).length },
                    ].map(stat => (
                      <div key={stat.label} className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-[#F5A623]">{stat.value}</p>
                        <p className="text-xs text-[#F8F6F0]/40 mt-0.5">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
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

              {tab === 'branches' && (
                <GitBranchMap
                  scenes={scenes}
                  onRestore={onClose}
                />
              )}

              {tab === 'guardrails' && setup && (
                <GuardrailsTab guardrails={setup.guardrails} />
              )}

              {tab === 'settings' && (
                <SettingsTab project={project} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
