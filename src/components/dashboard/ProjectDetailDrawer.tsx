import { useEffect, useState, useRef } from 'react'
import {
  loadProjectSetup,
  loadCharacters,
  loadCharacterGuardrails,
  addCharacterGuardrail,
  removeCharacterGuardrail,
  loadScenes,
  loadChoicesForScene,
  loadAllChoicesForScene,
  loadStoryState,
  listBranches,
  listSavepoints,
  loadScenesByBranch,
  createSavepoint,
  createBranch,
  setActiveBranch,
  deleteBranch,
  deleteSavepoint,
  generateScene,
  ensureMainBranch,
  updateProject,
  updateProjectGuardrails,
  deleteProject,
  exportStoryAsText,
  updateCharacter,
  deleteCharacter,
} from '@/services/storyService'
import type { Branch, Savepoint } from '@/services/storyService'
import { useStory } from '@/contexts/StoryContext'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { GitBranchMap } from './GitBranchMap'
import type { Character, CharacterGuardrail, Choice, ProjectSetup, Scene } from '@/types/story'
import {
  ArrowLeft, Users, GitBranch, Shield, BookOpen,
  ChevronDown, ChevronRight, Trash2, Plus, User,
  AlertTriangle, Settings, Film, Hash, Wand2,
  Bookmark, Loader2, PenLine, CheckCircle,
  Clock, Map, Eye, EyeOff, Download, Save,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  project: { id: string; title: string; genre: string; tone: string; status: string }
  onBack: () => void
}

type Tab = 'overview' | 'characters' | 'play' | 'guardrails' | 'settings'

const TAB_STORAGE_KEY = (id: string) => `storyforge:detail-tab:${id}`

// ── Helpers ───────────────────────────────────────────────────────────────────

function roleColor(role: string) {
  return role === 'protagonist' ? '#F5A623'
    : role === 'antagonist' ? '#f87171'
    : role === 'minor' ? '#60a5fa'
    : '#94a3b8'
}

function formatRelative(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = Math.floor((now.getTime() - d.getTime()) / 36e5)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  if (diffH < 24 * 7) return `${Math.floor(diffH / 24)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── Scene Loader ──────────────────────────────────────────────────────────────

function SceneLoader() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-[#3D3D7A]" />
        <div className="absolute inset-0 rounded-full border-4 border-[#F5A623] border-t-transparent animate-spin" />
        <Wand2 className="absolute inset-0 m-auto w-6 h-6 text-[#F5A623]" />
      </div>
      <div className="text-center">
        <p className="text-[#F8F6F0] font-semibold text-lg">Generating scene…</p>
        <p className="text-[#F8F6F0]/40 text-sm mt-1">The AI is weaving your narrative</p>
      </div>
    </div>
  )
}

// ── Savepoint Modal ───────────────────────────────────────────────────────────

function SavepointModal({ onSave, onClose }: { onSave: (n: string, d: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try { await onSave(name.trim(), desc.trim()); onClose() }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl p-7 flex flex-col gap-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-[#F8F6F0] flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-[#F5A623]" /> Save as Savepoint
        </h2>
        <p className="text-sm text-[#F8F6F0]/50">Create a named bookmark at this scene. You can branch from it later.</p>
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-[#F8F6F0]/60 block mb-2">Name *</label>
            <input autoFocus value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. Before the forest"
              className="w-full px-4 py-3 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#F8F6F0]/60 block mb-2">Description (optional)</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              placeholder="What's significant about this moment?"
              className="w-full px-4 py-3 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="md" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button size="md" className="flex-1" disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
            Save Savepoint
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Branches Modal ────────────────────────────────────────────────────────────

function BranchesModal({
  projectId, scenes, onClose, onBranchSwitch,
}: {
  projectId: string
  scenes: Scene[]
  activeBranchId?: string | null
  onClose: () => void
  onBranchSwitch: (branchId: string) => Promise<void>
}) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [savepoints, setSavepoints] = useState<Savepoint[]>([])
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState<string | null>(null)
  const [newBranchName, setNewBranchName] = useState('')
  const [creatingBranch, setCreatingBranch] = useState(false)
  const [branchFromSp, setBranchFromSp] = useState<Savepoint | null>(null)
  const [bfspName, setBfspName] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const [b, s] = await Promise.all([listBranches(projectId), listSavepoints(projectId)])
      setBranches(b); setSavepoints(s)
    } finally { setLoading(false) }
  }

  useEffect(() => { void loadData() }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwitch = async (branchId: string) => {
    setSwitching(branchId)
    try { await onBranchSwitch(branchId); await loadData() }
    finally { setSwitching(null) }
  }

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return
    setCreatingBranch(true)
    try {
      const branch = await createBranch(projectId, newBranchName.trim(), '', null)
      await setActiveBranch(projectId, branch.id)
      await onBranchSwitch(branch.id)
      setNewBranchName('')
      await loadData()
    } finally { setCreatingBranch(false) }
  }

  const handleBranchFromSp = async () => {
    if (!branchFromSp || !bfspName.trim()) return
    setCreatingBranch(true)
    try {
      const branch = await createBranch(projectId, bfspName.trim(), `From savepoint: ${branchFromSp.name}`, branchFromSp.sceneId)
      await setActiveBranch(projectId, branch.id)
      await onBranchSwitch(branch.id)
      setBranchFromSp(null); setBfspName('')
      await loadData()
    } finally { setCreatingBranch(false) }
  }

  const activeBranch = branches.find(b => b.isActive)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-[#3D3D7A] shrink-0">
          <h2 className="text-xl font-bold text-[#F8F6F0] flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#F5A623]" /> Story Branches
          </h2>
          {activeBranch && (
            <Badge variant="gold" className="text-sm">Active: {activeBranch.name}</Badge>
          )}
          <button onClick={onClose} className="text-[#F8F6F0]/40 hover:text-[#F8F6F0] transition-colors cursor-pointer text-2xl leading-none ml-4">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-7 flex flex-col gap-6">
          {/* Git graph */}
          <div>
            <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Scene Graph</p>
            <GitBranchMap scenes={scenes} onRestore={() => {}} />
          </div>

          {/* Branches list */}
          <div>
            <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">
              Branches ({branches.length})
            </p>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-[#F5A623] animate-spin" /></div>
            ) : branches.length === 0 ? (
              <p className="text-[#F8F6F0]/30 text-sm text-center py-4">No branches yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {branches.map(b => (
                  <div key={b.id} className="flex items-center gap-3 p-4 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${b.isActive ? 'bg-[#F5A623]' : 'bg-[#3D3D7A]'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#F8F6F0]">{b.name}</span>
                        {b.isActive && <Badge variant="gold" className="text-xs">active</Badge>}
                      </div>
                      {b.description && <p className="text-xs text-[#F8F6F0]/40 mt-0.5 truncate">{b.description}</p>}
                    </div>
                    {!b.isActive && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="sm" disabled={switching === b.id} onClick={() => handleSwitch(b.id)}>
                          {switching === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Switch
                        </Button>
                        <button onClick={async () => { await deleteBranch(b.id); await loadData() }}
                          className="p-1.5 text-[#F8F6F0]/20 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-400/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* New branch input */}
            <div className="flex gap-2 mt-3">
              <input value={newBranchName} onChange={e => setNewBranchName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateBranch()}
                placeholder="New branch name…"
                className="flex-1 px-4 py-2.5 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50"
              />
              <Button size="sm" disabled={!newBranchName.trim() || creatingBranch} onClick={handleCreateBranch}>
                {creatingBranch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Create
              </Button>
            </div>
          </div>

          {/* Savepoints list */}
          <div>
            <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">
              Savepoints ({savepoints.length})
            </p>
            {savepoints.length === 0 ? (
              <p className="text-[#F8F6F0]/30 text-sm text-center py-4">No savepoints yet. Use "Save Point" in the play area.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {savepoints.map(sp => {
                  const scene = scenes.find(s => s.id === sp.sceneId)
                  const branch = branches.find(b => b.id === sp.branchId)
                  const isExpanding = branchFromSp?.id === sp.id
                  return (
                    <div key={sp.id} className="p-4 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl">
                      <div className="flex items-start gap-3">
                        <Bookmark className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-[#F8F6F0]">{sp.name}</span>
                            {branch && <Badge variant="default" className="text-xs">{branch.name}</Badge>}
                          </div>
                          {sp.description && <p className="text-xs text-[#F8F6F0]/40 mt-0.5">{sp.description}</p>}
                          {scene && <p className="text-xs text-[#F8F6F0]/25 mt-0.5">at: {scene.title}</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button variant="ghost" size="sm" onClick={() => { setBranchFromSp(isExpanding ? null : sp); setBfspName(`from-${sp.name.toLowerCase().replace(/\s+/g, '-')}`) }}>
                            <GitBranch className="w-3.5 h-3.5" /> Branch
                          </Button>
                          <button onClick={async () => { await deleteSavepoint(sp.id); await loadData() }}
                            className="p-1.5 text-[#F8F6F0]/20 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-400/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {isExpanding && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-[#3D3D7A]/50">
                          <input value={bfspName} onChange={e => setBfspName(e.target.value)}
                            placeholder="New branch name…"
                            className="flex-1 px-3 py-2 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50"
                          />
                          <Button size="sm" disabled={!bfspName.trim() || creatingBranch} onClick={handleBranchFromSp}>
                            {creatingBranch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                            Branch Here
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Play Tab ──────────────────────────────────────────────────────────────────

function PlayTab({ project: _project }: { project: Props['project'] }) {
  const { state, dispatch } = useStory()
  const { currentScene, currentChoices, storyState, setup, projectId, generating, error, activeBranchId } = state

  const [historyOpen, setHistoryOpen] = useState(false)
  const [customChoice, setCustomChoice] = useState('')
  const [guardrailWarnings, setGuardrailWarnings] = useState<string[]>([])
  const [savepointOpen, setSavepointOpen] = useState(false)
  const [branchesOpen, setBranchesOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const hasScenes = state.scenes.length > 0
  const isEnding = currentScene?.isEnding ?? false

  useEffect(() => {
    if (!generating) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentScene, generating])

  const handleChoice = async (choiceLabel: string) => {
    if (!projectId || !setup || !currentScene) return
    dispatch({ type: 'SET_GENERATING', payload: true })
    setGuardrailWarnings([])
    try {
      const result = await generateScene(projectId, setup, currentScene.id, choiceLabel, storyState ?? undefined, activeBranchId ?? undefined)
      dispatch({ type: 'ADD_SCENE', payload: { scene: result.scene, choices: result.choices } })
      if (result.stateUpdates) dispatch({ type: 'SET_STORY_STATE', payload: result.stateUpdates as never })
      if (result.guardrailViolations?.length) setGuardrailWarnings(result.guardrailViolations)
      setCustomChoice('')
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Generation failed' })
    }
  }

  const handleGenerateOpening = async () => {
    if (!projectId || !setup) return
    dispatch({ type: 'SET_GENERATING', payload: true })
    setGuardrailWarnings([])
    try {
      const branchId = await ensureMainBranch(projectId)
      dispatch({ type: 'SET_BRANCH', payload: branchId })
      const result = await generateScene(projectId, setup, undefined, undefined, undefined, branchId)
      dispatch({ type: 'ADD_SCENE', payload: { scene: result.scene, choices: result.choices } })
      if (result.stateUpdates) dispatch({ type: 'SET_STORY_STATE', payload: result.stateUpdates as never })
      if (result.guardrailViolations?.length) setGuardrailWarnings(result.guardrailViolations)
    } catch (e) {
      dispatch({ type: 'SET_ERROR', payload: e instanceof Error ? e.message : 'Generation failed' })
    }
  }

  const handleSavepoint = async (name: string, description: string) => {
    if (!projectId || !currentScene) return
    let branchId = activeBranchId
    if (!branchId) {
      const branches = await listBranches(projectId)
      branchId = branches.find(b => b.name === 'main')?.id ?? branches[0]?.id ?? null
    }
    await createSavepoint(projectId, currentScene.id, name, description, branchId)
  }

  const handleBranchSwitch = async (branchId: string) => {
    if (!projectId) return
    await setActiveBranch(projectId, branchId)
    dispatch({ type: 'SET_BRANCH', payload: branchId })
    const branchScenes = await loadScenesByBranch(projectId, branchId)
    if (branchScenes.length > 0) {
      const last = branchScenes[branchScenes.length - 1]
      const choices = await loadAllChoicesForScene(last.id)
      dispatch({ type: 'LOAD_HISTORY', payload: { scenes: branchScenes, currentChoices: choices.filter(c => !c.leadsToSceneId) } })
    } else {
      dispatch({ type: 'LOAD_HISTORY', payload: { scenes: [], currentChoices: [] } })
    }
  }

  const handleJumpToScene = async (scene: Scene) => {
    const choices = await loadAllChoicesForScene(scene.id)
    dispatch({ type: 'SET_CURRENT_SCENE', payload: { scene, choices: choices.filter(c => !c.leadsToSceneId) } })
    setHistoryOpen(false)
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Action bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[#F8F6F0]/50 text-sm">
            Turn {storyState?.turnCount ?? state.scenes.length} · {setup?.genre} · {setup?.tone}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasScenes && currentScene && (
            <Button variant="ghost" size="sm" onClick={() => setSavepointOpen(true)}>
              <Bookmark className="w-4 h-4" /> Save Point
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setBranchesOpen(true)}>
            <GitBranch className="w-4 h-4" /> View Branches
          </Button>
        </div>
      </div>

      {/* ── Guardrail warnings ─────────────────────────────────────────────── */}
      {guardrailWarnings.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-300">
            <p className="font-semibold mb-1">Guardrail adjustments applied:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {guardrailWarnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-400">
          {error}
        </div>
      )}

      {/* ── Scene history (collapsible) ────────────────────────────────────── */}
      {hasScenes && (
        <div className="border border-[#3D3D7A] rounded-2xl overflow-hidden">
          <button
            onClick={() => setHistoryOpen(v => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[#2D2D5E]/30 transition-colors cursor-pointer"
          >
            <span className="font-semibold text-[#F8F6F0]/70 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#F5A623]" />
              Scene History
              <span className="text-sm font-normal text-[#F8F6F0]/30">({state.scenes.length} scenes)</span>
            </span>
            {historyOpen
              ? <ChevronDown className="w-5 h-5 text-[#F8F6F0]/30" />
              : <ChevronRight className="w-5 h-5 text-[#F8F6F0]/30" />}
          </button>
          {historyOpen && (
            <div className="border-t border-[#3D3D7A]/50 max-h-80 overflow-y-auto">
              {state.scenes.map((scene, i) => {
                const isCurrent = scene.id === currentScene?.id
                return (
                  <button
                    key={scene.id}
                    onClick={() => handleJumpToScene(scene)}
                    className={`w-full text-left px-6 py-3 flex items-center gap-3 transition-colors cursor-pointer hover:bg-[#2D2D5E]/40 border-b border-[#3D3D7A]/30 last:border-0 ${isCurrent ? 'bg-[#F5A623]/10' : ''}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isCurrent ? 'bg-[#F5A623] text-[#1A1A3E]' : 'bg-[#3D3D7A] text-[#F8F6F0]/50'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate text-sm ${isCurrent ? 'text-[#F5A623]' : 'text-[#F8F6F0]/80'}`}>{scene.title}</p>
                      {scene.choiceMade && <p className="text-xs text-[#F8F6F0]/30 truncate italic">"{scene.choiceMade}"</p>}
                    </div>
                    {isCurrent && <span className="text-xs text-[#F5A623] shrink-0 font-medium">current</span>}
                    {scene.isEnding && <Badge variant="gold" className="text-xs shrink-0">Ending</Badge>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Main scene area ────────────────────────────────────────────────── */}
      {generating ? (
        <SceneLoader />
      ) : !hasScenes ? (
        <div className="flex flex-col items-center justify-center gap-8 py-24">
          <div className="w-24 h-24 rounded-3xl bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-[#F5A623]/50" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#F8F6F0] mb-3">Ready to begin?</h2>
            <p className="text-[#F8F6F0]/50 text-lg max-w-sm mx-auto leading-relaxed">
              Your story world is set. Generate the opening scene to start your adventure.
            </p>
          </div>
          <Button size="lg" onClick={handleGenerateOpening} className="text-base px-8 py-4">
            <Wand2 className="w-5 h-5" /> Generate Opening Scene
          </Button>
        </div>
      ) : currentScene ? (
        <>
          {/* Current scene card */}
          <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="text-2xl font-bold text-[#F8F6F0] leading-snug">{currentScene.title}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {isEnding && <Badge variant="gold" className="text-sm">Ending</Badge>}
                <Badge variant="default" className="text-sm">Scene {state.scenes.length}</Badge>
              </div>
            </div>
            {currentScene.choiceMade && (
              <p className="text-sm text-[#F5A623]/70 italic mb-5 pb-5 border-b border-[#3D3D7A]/40">
                You chose: "{currentScene.choiceMade}"
              </p>
            )}
            <div className="flex flex-col gap-4">
              {currentScene.content.split('\n\n').map((para, i) => (
                <p key={i} className="text-[#F8F6F0]/90 text-lg leading-loose">
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* Preset choices */}
          {!isEnding && currentChoices.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-widest">
                What do you do?
              </p>
              {currentChoices.map(choice => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice.label)}
                  disabled={generating}
                  className="w-full text-left p-5 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl hover:border-[#F5A623]/50 hover:bg-[#2D2D5E]/70 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#F5A623]/25 transition-colors">
                      <ChevronRight className="w-4 h-4 text-[#F5A623]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#F8F6F0] text-base leading-snug">{choice.label}</p>
                      {choice.description && (
                        <p className="text-[#F8F6F0]/55 text-sm mt-1.5 leading-relaxed">{choice.description}</p>
                      )}
                      {choice.consequenceHint && (
                        <p className="text-[#F5A623]/60 text-sm mt-2 italic">→ {choice.consequenceHint}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Custom choice */}
          {!isEnding && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-widest">
                Or write your own choice
              </p>
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-3 px-5 py-4 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl focus-within:border-[#F5A623]/50 transition-colors">
                  <PenLine className="w-5 h-5 text-[#F8F6F0]/30 shrink-0" />
                  <input
                    value={customChoice}
                    onChange={e => setCustomChoice(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !generating && customChoice.trim() && handleChoice(customChoice.trim())}
                    placeholder="Describe what you want to do…"
                    disabled={generating}
                    className="flex-1 bg-transparent text-[#F8F6F0] text-base placeholder-[#F8F6F0]/25 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <Button
                  size="md"
                  disabled={!customChoice.trim() || generating}
                  onClick={() => handleChoice(customChoice.trim())}
                  className="px-6"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}

          {/* Ending CTA */}
          {isEnding && (
            <div className="text-center py-10">
              <p className="text-[#F5A623] font-semibold text-xl mb-4">Your story has reached its conclusion.</p>
              <Button size="lg" onClick={() => setBranchesOpen(true)}>
                <Map className="w-5 h-5" /> View Story Map
              </Button>
            </div>
          )}
        </>
      ) : null}

      <div ref={bottomRef} />

      {savepointOpen && (
        <SavepointModal onSave={handleSavepoint} onClose={() => setSavepointOpen(false)} />
      )}
      {branchesOpen && projectId && (
        <BranchesModal
          projectId={projectId}
          scenes={state.scenes}
          activeBranchId={activeBranchId}
          onClose={() => setBranchesOpen(false)}
          onBranchSwitch={handleBranchSwitch}
        />
      )}
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
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 rounded-full border-4 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
    </div>
  )

  const wordCount = scenes.reduce((n, s) => n + s.content.split(/\s+/).filter(Boolean).length, 0)
  const endingCount = scenes.filter(s => s.isEnding).length

  // Compute branch count (scenes with >1 child)
  const parentCounts: Record<string, number> = {}
  for (const s of scenes) {
    if (s.parentSceneId) parentCounts[s.parentSceneId] = (parentCounts[s.parentSceneId] ?? 0) + 1
  }
  const branchCount = Object.values(parentCounts).filter(c => c > 1).length

  const lastUpdated = scenes.length > 0
    ? formatRelative(new Date(Math.max(...scenes.map(s => new Date(s.createdAt).getTime()))).toISOString())
    : '—'

  const stats = [
    { icon: Film,      label: 'Scenes',      value: String(scenes.length) },
    { icon: Hash,      label: 'Words',       value: wordCount.toLocaleString() },
    { icon: GitBranch, label: 'Branches',    value: String(branchCount) },
    { icon: Clock,     label: 'Last Updated', value: lastUpdated },
  ]

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map(s => (
            <div key={s.label} className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <s.icon className="w-4 h-4 text-[#F5A623]/70" />
                <span className="text-sm text-[#F8F6F0]/40 uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-4xl font-bold text-[#F8F6F0]">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Synopsis */}
        <div>
          <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">
            Synopsis / Setting
          </p>
          <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-6">
            <p className="text-lg text-[#F8F6F0]/80 leading-relaxed">
              {setup.setting || <span className="text-[#F8F6F0]/25 italic">No synopsis provided. Edit in Settings.</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-8">
        {/* Details */}
        <div>
          <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Details</p>
          <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-6">
            <div className="flex flex-col divide-y divide-[#3D3D7A]/40">
              {[
                { label: 'Genre',       value: setup.genre },
                { label: 'Tone',        value: setup.tone },
                { label: 'Characters',  value: `${characters.length}` },
                { label: 'Guardrails',  value: `${setup.guardrails.length + guardrails.length}` },
                { label: 'Endings',     value: `${endingCount}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-4">
                  <span className="text-base text-[#F8F6F0]/40">{label}</span>
                  <span className="text-base font-semibold text-[#F8F6F0]/90">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Characters preview */}
        <div>
          <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Characters</p>
          <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl p-6">
            {characters.length === 0 ? (
              <p className="text-base text-[#F8F6F0]/25 italic">No characters yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {characters.map(c => (
                  <div key={c.id} className="flex items-center gap-2 px-3 py-2 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-xl">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: `${roleColor(c.role)}22`, border: `1.5px solid ${roleColor(c.role)}` }}>
                      <span style={{ color: roleColor(c.role) }}>{c.name.charAt(0)}</span>
                    </div>
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

// ── Character Bio Modal ───────────────────────────────────────────────────────

function CharacterModal({
  char, guardrails, projectId, onClose, onGuardrailAdded, onGuardrailRemoved, onToggleActive, onDelete,
}: {
  char: Character
  guardrails: CharacterGuardrail[]
  projectId: string
  onClose: () => void
  onGuardrailAdded: (g: CharacterGuardrail) => void
  onGuardrailRemoved: (id: string) => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const [newRule, setNewRule] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const charGuardrails = guardrails.filter(g => g.characterId === char.id)
  const color = roleColor(char.role)

  const handleAdd = async () => {
    if (!newRule.trim() || !char.id) return
    setSaving(true)
    try {
      const g = await addCharacterGuardrail(projectId, char.id, newRule.trim())
      onGuardrailAdded(g); setNewRule('')
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleRemove = async (id: string) => {
    try { await removeCharacterGuardrail(id); onGuardrailRemoved(id) } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-7 border-b border-[#3D3D7A]">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{ backgroundColor: `${color}22`, border: `2px solid ${color}` }}>
              <span style={{ color }}>{char.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h3 className="font-bold text-[#F8F6F0] text-xl">{char.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'} className="capitalize">
                  {char.role}
                </Badge>
                <Badge variant={char.isActive !== false ? 'success' : 'default'} className="text-xs">
                  {char.isActive !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onToggleActive}>
              {char.isActive !== false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {char.isActive !== false ? 'Deactivate' : 'Activate'}
            </Button>
            <button onClick={onClose} className="text-[#F8F6F0]/40 hover:text-[#F8F6F0] cursor-pointer text-2xl leading-none ml-2">×</button>
          </div>
        </div>

        <div className="p-7 flex flex-col gap-6 max-h-[60vh] overflow-y-auto">
          {/* Description */}
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
                {char.traits.map(t => <Badge key={t} variant="gold">{t}</Badge>)}
              </div>
            </div>
          )}

          {/* Character guardrails */}
          <div>
            <p className="text-sm font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-[#F5A623]" /> Character Guardrails
            </p>
            <div className="flex flex-col gap-2 mb-3">
              {charGuardrails.length === 0 && (
                <p className="text-sm text-[#F8F6F0]/30 italic">No guardrails set for this character.</p>
              )}
              {charGuardrails.map(g => (
                <div key={g.id} className="flex items-center gap-3 p-3 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl">
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
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40"
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

          {/* Delete */}
          <div className="pt-4 border-t border-[#3D3D7A]">
            {confirmDel ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#F8F6F0]/60">Are you sure? This cannot be undone.</span>
                <Button variant="danger" size="sm" onClick={onDelete}>Confirm Delete</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>Cancel</Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-red-400/70 hover:text-red-400" onClick={() => setConfirmDel(true)}>
                <Trash2 className="w-4 h-4" /> Delete Character
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Characters Tab ────────────────────────────────────────────────────────────

function CharactersTab({
  characters, setCharacters, guardrails, projectId, onGuardrailAdded, onGuardrailRemoved,
}: {
  characters: Character[]
  setCharacters: React.Dispatch<React.SetStateAction<Character[]>>
  guardrails: CharacterGuardrail[]
  projectId: string
  onGuardrailAdded: (g: CharacterGuardrail) => void
  onGuardrailRemoved: (id: string) => void
}) {
  const [selected, setSelected] = useState<Character | null>(null)

  const roleOrder: Record<string, number> = { protagonist: 0, antagonist: 1, supporting: 2, minor: 3 }
  const sorted = [...characters].sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3))

  const handleToggleActive = async (char: Character) => {
    if (!char.id) return
    const next = !(char.isActive !== false)
    await updateCharacter(char.id, { isActive: next })
    setCharacters(prev => prev.map(c => c.id === char.id ? { ...c, isActive: next } : c))
    setSelected(prev => prev && prev.id === char.id ? ({ ...prev, isActive: next } as Character) : prev)
  }

  const handleDelete = async (char: Character) => {
    if (!char.id) return
    await deleteCharacter(char.id)
    setCharacters(prev => prev.filter(c => c.id !== char.id))
    setSelected(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {characters.length === 0 && (
        <p className="text-[#F8F6F0]/30 text-lg text-center py-16">No characters found.</p>
      )}
      {sorted.map(char => {
        const charGuardrails = guardrails.filter(g => g.characterId === char.id)
        const color = roleColor(char.role)
        const inactive = char.isActive === false
        return (
          <div key={char.id}
            className={`border rounded-2xl overflow-hidden transition-opacity ${inactive ? 'opacity-50 border-[#3D3D7A]/50' : 'border-[#3D3D7A] bg-[#1A1A3E]/50'}`}>
            <div className="flex items-center gap-5 px-6 py-5">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                style={{ backgroundColor: `${color}22`, border: `2px solid ${color}` }}>
                <span style={{ color }}>{char.name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="font-bold text-[#F8F6F0] text-lg truncate">{char.name}</p>
                  <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'} className="capitalize">
                    {char.role}
                  </Badge>
                  {inactive && <Badge variant="default" className="text-xs">Inactive</Badge>}
                  {charGuardrails.length > 0 && (
                    <Badge variant="warning" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />{charGuardrails.length} guardrails
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-[#F8F6F0]/45 mt-1 truncate">{char.description}</p>
                {char.traits.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {char.traits.slice(0, 5).map(t => <Badge key={t} variant="gold" className="text-xs">{t}</Badge>)}
                    {char.traits.length > 5 && <span className="text-xs text-[#F8F6F0]/30">+{char.traits.length - 5}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleToggleActive(char)}
                  title={inactive ? 'Activate' : 'Deactivate'}
                  className="p-2.5 rounded-xl border border-[#3D3D7A] text-[#F8F6F0]/40 hover:text-[#F5A623] hover:border-[#F5A623]/40 transition-colors cursor-pointer"
                >
                  {inactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setSelected(char)}
                  title="View biography & guardrails"
                  className="p-2.5 rounded-xl border border-[#3D3D7A] text-[#F8F6F0]/40 hover:text-[#F5A623] hover:border-[#F5A623]/40 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4" />
                </button>
              </div>
            </div>
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
          onToggleActive={() => handleToggleActive(selected)}
          onDelete={() => handleDelete(selected)}
        />
      )}
    </div>
  )
}

// ── Guardrails Tab ────────────────────────────────────────────────────────────

function GuardrailsTab({
  guardrails, projectId, onChange,
}: {
  guardrails: string[]
  projectId: string
  onChange: (updated: string[]) => void
}) {
  // We manage a local list with active flags (index-based toggling stored in-memory)
  const [inactive, setInactive] = useState<Set<number>>(new Set())
  const [newRule, setNewRule] = useState('')
  const [saving, setSaving] = useState(false)

  // Note: story-level guardrails are stored on the projects table as a string[].
  // Adding a new one requires updating the project record.
  const handleAdd = async () => {
    if (!newRule.trim()) return
    setSaving(true)
    try {
      const updated = [...guardrails, newRule.trim()]
      await updateProjectGuardrails(projectId, updated)
      onChange(updated)
      setNewRule('')
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const handleRemove = async (idx: number) => {
    const updated = guardrails.filter((_, i) => i !== idx)
    try {
      await updateProjectGuardrails(projectId, updated)
      onChange(updated)
      setInactive(prev => { const n = new Set(prev); n.delete(idx); return n })
    } catch { /* ignore */ }
  }

  const toggleInactive = (idx: number) => {
    setInactive(prev => {
      const n = new Set(prev)
      if (n.has(idx)) n.delete(idx); else n.add(idx)
      return n
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#F8F6F0]">Story Guardrails</h2>
          <p className="text-[#F8F6F0]/45 mt-1">Rules that shape every scene the AI generates.</p>
        </div>
        <Badge variant="default" className="text-sm">{guardrails.length} rules</Badge>
      </div>

      {/* Add new */}
      <div className="flex gap-3">
        <input
          value={newRule}
          onChange={e => setNewRule(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="e.g. No graphic violence"
          className="flex-1 px-5 py-3.5 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-base placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50"
        />
        <Button size="md" loading={saving} disabled={!newRule.trim()} onClick={handleAdd}>
          <Plus className="w-4 h-4" /> Add Rule
        </Button>
      </div>

      {/* List */}
      {guardrails.length === 0 ? (
        <p className="text-[#F8F6F0]/30 text-base text-center py-12">No story-level guardrails set.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {guardrails.map((g, i) => {
            const isInactive = inactive.has(i)
            return (
              <div key={i} className={`flex items-start gap-4 p-5 border rounded-2xl transition-opacity ${isInactive ? 'opacity-40 border-[#3D3D7A]/40 bg-transparent' : 'border-[#3D3D7A] bg-[#2D2D5E]/30'}`}>
                <Shield className="w-5 h-5 text-[#F5A623] shrink-0 mt-0.5" />
                <p className={`flex-1 text-base leading-relaxed ${isInactive ? 'text-[#F8F6F0]/40 line-through' : 'text-[#F8F6F0]/80'}`}>{g}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleInactive(i)}
                    title={isInactive ? 'Enable' : 'Disable'}
                    className="p-2 rounded-lg border border-[#3D3D7A] text-[#F8F6F0]/30 hover:text-[#F5A623] hover:border-[#F5A623]/40 transition-colors cursor-pointer"
                  >
                    {isInactive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleRemove(i)}
                    className="p-2 rounded-lg border border-[#3D3D7A] text-[#F8F6F0]/30 hover:text-red-400 hover:border-red-500/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab({
  project, setup, onBack,
}: {
  project: Props['project']
  setup: ProjectSetup | null
  onBack: () => void
}) {
  const [title, setTitle]     = useState(project.title)
  const [genre, setGenre]     = useState(project.genre)
  const [tone, setTone]       = useState(project.tone)
  const [setting, setSetting] = useState(setup?.setting ?? '')
  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const { dispatch } = useStory()

  const handleSave = async () => {
    setSaving(true); setSaveMsg(null)
    try {
      await updateProject(project.id, { title: title.trim(), genre: genre.trim(), tone: tone.trim(), setting: setting.trim() })
      setSaveMsg('Saved!')
      setTimeout(() => setSaveMsg(null), 2500)
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Save failed')
    } finally { setSaving(false) }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const text = await exportStoryAsText(project.id, title)
      const blob = new Blob([text], { type: 'text/markdown' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `${title.replace(/\s+/g, '_')}.md`; a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteProject(project.id)
      dispatch({ type: 'RESET' })
      onBack()
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Delete failed')
      setDeleting(false)
    }
  }

  const fieldClass = 'w-full px-5 py-4 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-base placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50'
  const labelClass = 'block text-sm font-semibold text-[#F8F6F0]/50 uppercase tracking-wide mb-2'

  return (
    <div className="flex flex-col gap-10 max-w-2xl">
      {/* Edit details */}
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#F8F6F0]">Story Details</h2>
        <div>
          <label className={labelClass}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Story title" className={fieldClass} />
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Genre</label>
            <input value={genre} onChange={e => setGenre(e.target.value)} placeholder="e.g. Fantasy" className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Tone</label>
            <input value={tone} onChange={e => setTone(e.target.value)} placeholder="e.g. Dark" className={fieldClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Synopsis / Setting</label>
          <textarea value={setting} onChange={e => setSetting(e.target.value)} rows={4}
            placeholder="Describe your story world and premise…"
            className={`${fieldClass} resize-none`}
          />
        </div>
        <div className="flex items-center gap-4">
          <Button size="md" loading={saving} onClick={handleSave} className="px-8">
            <Save className="w-4 h-4" /> Save Changes
          </Button>
          {saveMsg && (
            <span className={`text-sm ${saveMsg === 'Saved!' ? 'text-emerald-400' : 'text-red-400'}`}>
              {saveMsg}
            </span>
          )}
        </div>
      </div>

      {/* Export */}
      <div className="pt-8 border-t border-[#3D3D7A]">
        <h2 className="text-xl font-bold text-[#F8F6F0] mb-2">Export</h2>
        <p className="text-[#F8F6F0]/45 mb-5">Download your full story as a Markdown file.</p>
        <Button variant="secondary" size="md" loading={exporting} onClick={handleExport}>
          <Download className="w-4 h-4" /> Export as Markdown
        </Button>
      </div>

      {/* Danger zone */}
      <div className="pt-8 border-t border-red-500/20">
        <h2 className="text-xl font-bold text-red-400/80 mb-2">Danger Zone</h2>
        <p className="text-[#F8F6F0]/40 mb-5">Permanently delete this story. This action cannot be undone.</p>
        {confirmDel ? (
          <div className="flex items-center gap-4 p-5 bg-red-500/10 border border-red-500/30 rounded-xl">
            <span className="text-[#F8F6F0]/70 text-sm flex-1">
              Delete "<span className="font-semibold text-[#F8F6F0]">{project.title}</span>" and all its scenes, characters, and branches?
            </span>
            <Button variant="danger" size="md" loading={deleting} onClick={handleDelete}>
              <Trash2 className="w-4 h-4" /> Yes, Delete
            </Button>
            <Button variant="ghost" size="md" disabled={deleting} onClick={() => setConfirmDel(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="md" className="text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40" onClick={() => setConfirmDel(true)}>
            <Trash2 className="w-4 h-4" /> Delete Story
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Main ProjectDetailPage ────────────────────────────────────────────────────

export function ProjectDetailPage({ project, onBack }: Props) {
  const { state, dispatch } = useStory()

  // Persist tab selection per project
  const savedTab = localStorage.getItem(TAB_STORAGE_KEY(project.id)) as Tab | null
  const [tab, setTab] = useState<Tab>(savedTab ?? 'overview')

  const [setup,       setSetup]      = useState<ProjectSetup | null>(null)
  const [characters,  setCharacters] = useState<Character[]>([])
  const [guardrails,  setGuardrails] = useState<CharacterGuardrail[]>([])
  const [scenes,      setScenes]     = useState<Scene[]>([])
  const [loadingData, setLoading]    = useState(true)
  const [loadError,   setLoadError]  = useState<string | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [hydrating,   setHydrating]  = useState(false)

  // Save tab to localStorage whenever it changes
  const changeTab = (next: Tab) => {
    setTab(next)
    localStorage.setItem(TAB_STORAGE_KEY(project.id), next)
  }

  // Load project metadata
  useEffect(() => {
    setLoading(true); setLoadError(null); setPlayerReady(false)
    Promise.all([
      loadProjectSetup(project.id),
      loadCharacters(project.id),
      loadCharacterGuardrails(project.id),
      loadScenes(project.id),
    ])
      .then(([s, c, g, sc]) => { setSetup(s); setCharacters(c); setGuardrails(g); setScenes(sc) })
      .catch(e => setLoadError(e instanceof Error ? e.message : 'Failed to load project'))
      .finally(() => setLoading(false))
  }, [project.id])

  // Hydrate story player context
  const hydratePlayer = async () => {
    if (playerReady && state.projectId === project.id) return
    setHydrating(true); setLoadError(null)
    try {
      const [projectSetup, branches, storyState] = await Promise.all([
        setup ? Promise.resolve(setup) : loadProjectSetup(project.id),
        listBranches(project.id),
        loadStoryState(project.id),
      ])
      const activeBranch = branches.find(b => b.isActive) ?? branches.find(b => b.name === 'main') ?? branches[0]
      const projectScenes = activeBranch
        ? await loadScenesByBranch(project.id, activeBranch.id)
        : await loadScenes(project.id)

      dispatch({ type: 'SET_PROJECT', payload: { projectId: project.id, setup: projectSetup } })
      dispatch({ type: 'SET_BRANCH', payload: activeBranch?.id ?? null })

      const currentChoices: Choice[] = projectScenes.length > 0
        ? await loadChoicesForScene(projectScenes[projectScenes.length - 1].id)
        : []
      dispatch({ type: 'LOAD_HISTORY', payload: { scenes: projectScenes, currentChoices } })
      if (storyState) dispatch({ type: 'SET_STORY_STATE', payload: storyState })
      setPlayerReady(true)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load story player')
    } finally { setHydrating(false) }
  }

  const handleTabChange = async (next: Tab) => {
    changeTab(next)
    if (next === 'play') { void hydratePlayer() }
  }

  // Status display
  const STATUS_META: Record<string, { label: string; variant: 'default' | 'gold' | 'success' | 'warning' | 'danger' }> = {
    setup:     { label: 'Draft',       variant: 'default'  },
    active:    { label: 'In-Progress', variant: 'warning'  },
    completed: { label: 'Complete',    variant: 'success'  },
  }
  const statusMeta = STATUS_META[project.status] ?? STATUS_META.setup

  const sceneCount = playerReady && state.projectId === project.id ? state.scenes.length : scenes.length

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview',    label: 'Overview',    icon: BookOpen  },
    { id: 'characters',  label: `Characters${characters.length > 0 ? ` (${characters.length})` : ''}`, icon: Users },
    { id: 'play',        label: `Play${sceneCount > 0 ? ` (${sceneCount})` : ''}`,  icon: Wand2    },
    { id: 'guardrails',  label: 'Guardrails',  icon: Shield    },
    { id: 'settings',    label: 'Settings',    icon: Settings  },
  ]

  return (
    <div className="w-full min-h-screen bg-[#1A1A3E] flex flex-col">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-6 px-10 py-7 border-b border-[#3D3D7A] shrink-0">
        <div className="flex items-center gap-5 min-w-0">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#F8F6F0]/50 hover:text-[#F8F6F0] transition-colors cursor-pointer shrink-0 text-base font-medium"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>
          <div className="w-px h-7 bg-[#3D3D7A]" />
          <h1 className="text-3xl font-bold text-[#F8F6F0] truncate">{project.title}</h1>
        </div>
        <Badge variant={statusMeta.variant} className="text-sm shrink-0 px-3 py-1">
          {statusMeta.label}
        </Badge>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex border-b border-[#3D3D7A] shrink-0 overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex-1 flex items-center justify-center gap-2.5 px-6 py-5 text-base font-medium whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
              tab === id
                ? 'border-[#F5A623] text-[#F5A623] bg-[#F5A623]/5'
                : 'border-transparent text-[#F8F6F0]/40 hover:text-[#F8F6F0]/70 hover:bg-[#2D2D5E]/30'
            }`}
          >
            <Icon className="w-4.5 h-4.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-10 py-10">
        {loadingData ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
          </div>
        ) : loadError ? (
          <div className="p-6 bg-red-500/15 border border-red-500/30 rounded-2xl text-red-400 text-base">
            {loadError}
          </div>
        ) : (
          <>
            {tab === 'overview' && (
              <OverviewTab
                setup={setup}
                scenes={playerReady && state.projectId === project.id ? state.scenes : scenes}
                characters={characters}
                guardrails={guardrails}
              />
            )}

            {tab === 'characters' && (
              <CharactersTab
                characters={characters}
                setCharacters={setCharacters}
                guardrails={guardrails}
                projectId={project.id}
                onGuardrailAdded={g => setGuardrails(prev => [...prev, g])}
                onGuardrailRemoved={id => setGuardrails(prev => prev.filter(g => g.id !== id))}
              />
            )}

            {tab === 'play' && (
              hydrating ? (
                <div className="flex flex-col items-center justify-center gap-4 py-20">
                  <div className="w-10 h-10 rounded-full border-4 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
                  <p className="text-[#F8F6F0]/50">Loading story player…</p>
                </div>
              ) : !playerReady ? (
                <div className="flex flex-col items-center gap-6 py-24">
                  <BookOpen className="w-16 h-16 text-[#F8F6F0]/15" />
                  <div className="text-center">
                    <p className="text-xl font-semibold text-[#F8F6F0]/60 mb-2">Story player not loaded</p>
                    <p className="text-[#F8F6F0]/35 mb-6">Click below to initialize the play session.</p>
                    <Button size="lg" onClick={hydratePlayer}>
                      <Wand2 className="w-5 h-5" /> Load Story Player
                    </Button>
                  </div>
                </div>
              ) : (
                <PlayTab project={project} />
              )
            )}

            {tab === 'guardrails' && (
              <GuardrailsTab
                guardrails={setup?.guardrails ?? []}
                projectId={project.id}
                onChange={updated => setSetup(prev => prev ? { ...prev, guardrails: updated } : prev)}
              />
            )}

            {tab === 'settings' && (
              <SettingsTab project={project} setup={setup} onBack={onBack} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
