import { useState, useEffect } from 'react'
import { useStory } from '@/contexts/StoryContext'
import {
  listBranches,
  listSavepoints,
  createBranch,
  setActiveBranch,
  deleteBranch,
  deleteSavepoint,
  loadScenesByBranch,
  loadAllChoicesForScene,
  createSavepoint,
} from '@/services/storyService'
import type { Branch, Savepoint } from '@/services/storyService'
import { GitBranchMap } from '@/components/dashboard/GitBranchMap'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  GitBranch, Bookmark, Plus, Trash2, CheckCircle,
  RefreshCw, Loader2, Wand2,
} from 'lucide-react'

// ── New Branch Modal ──────────────────────────────────────────────────────────
interface NewBranchModalProps {
  onSave: (name: string, description: string) => Promise<void>
  onClose: () => void
}

function NewBranchModal({ onSave, onClose }: NewBranchModalProps) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim(), desc.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[#F8F6F0] flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[#F5A623]" /> Create New Branch
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-[#F8F6F0]/60 block mb-1">Branch Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. dark-path"
              className="w-full px-3 py-2 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#F8F6F0]/60 block mb-1">Description</label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="What's different about this branch?"
              className="w-full px-3 py-2 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Create Branch
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Branch from Savepoint Modal ───────────────────────────────────────────────
interface BranchFromSavepointModalProps {
  savepoint: Savepoint
  onSave: (name: string, description: string) => Promise<void>
  onClose: () => void
}

function BranchFromSavepointModal({ savepoint, onSave, onClose }: BranchFromSavepointModalProps) {
  const [name, setName] = useState(`from-${savepoint.name.toLowerCase().replace(/\s+/g, '-')}`)
  const [desc, setDesc] = useState(`Branching from savepoint: ${savepoint.name}`)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(name.trim(), desc.trim())
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold text-[#F8F6F0] flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[#F5A623]" /> Branch from "{savepoint.name}"
        </h2>
        <p className="text-sm text-[#F8F6F0]/50">
          This will create a new branch starting from this savepoint.
        </p>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-[#F8F6F0]/60 block mb-1">New Branch Name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[#F8F6F0]/60 block mb-1">Description</label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full px-3 py-2 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-sm placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/50"
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!name.trim() || saving} onClick={handleSave}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
            Branch Here
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── BranchesTab ───────────────────────────────────────────────────────────────
export function BranchesTab() {
  const { state, dispatch } = useStory()
  const { projectId, scenes, activeBranchId } = state

  const [branches, setBranches] = useState<Branch[]>([])
  const [savepoints, setSavepoints] = useState<Savepoint[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [switchingBranch, setSwitchingBranch] = useState<string | null>(null)
  const [newBranchModal, setNewBranchModal] = useState(false)
  const [branchFromSavepoint, setBranchFromSavepoint] = useState<Savepoint | null>(null)

  const loadData = async () => {
    if (!projectId) return
    setLoadingBranches(true)
    try {
      const [b, s] = await Promise.all([
        listBranches(projectId),
        listSavepoints(projectId),
      ])
      setBranches(b)
      setSavepoints(s)
      // Sync active branch to context
      const active = b.find(br => br.isActive)
      if (active && active.id !== activeBranchId) {
        dispatch({ type: 'SET_BRANCH', payload: active.id })
      }
    } finally {
      setLoadingBranches(false)
    }
  }

  useEffect(() => { loadData() }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSwitchBranch = async (branchId: string) => {
    if (!projectId) return
    setSwitchingBranch(branchId)
    try {
      await setActiveBranch(projectId, branchId)
      dispatch({ type: 'SET_BRANCH', payload: branchId })
      // Load scenes for new branch
      const branchScenes = await loadScenesByBranch(projectId, branchId)
      if (branchScenes.length > 0) {
        const last = branchScenes[branchScenes.length - 1]
        const choices = await loadAllChoicesForScene(last.id)
        const openChoices = choices.filter(c => !c.leadsToSceneId)
        dispatch({ type: 'LOAD_HISTORY', payload: { scenes: branchScenes, currentChoices: openChoices } })
      } else {
        dispatch({ type: 'LOAD_HISTORY', payload: { scenes: [], currentChoices: [] } })
      }
      await loadData()
    } finally {
      setSwitchingBranch(null)
    }
  }

  const handleDeleteBranch = async (branch: Branch) => {
    if (!projectId) return
    if (branch.isActive) return // can't delete active branch
    await deleteBranch(branch.id)
    await loadData()
  }

  const handleDeleteSavepoint = async (savepointId: string) => {
    await deleteSavepoint(savepointId)
    await loadData()
  }

  const handleCreateBranch = async (name: string, description: string) => {
    if (!projectId) return
    const branch = await createBranch(projectId, name, description, null)
    await setActiveBranch(projectId, branch.id)
    dispatch({ type: 'SET_BRANCH', payload: branch.id })
    await loadData()
  }

  const handleBranchFromSavepoint = async (
    savepoint: Savepoint,
    name: string,
    description: string,
  ) => {
    if (!projectId) return
    const branch = await createBranch(projectId, name, description, savepoint.sceneId)
    await setActiveBranch(projectId, branch.id)
    dispatch({ type: 'SET_BRANCH', payload: branch.id })
    await loadData()
  }

  const handleRestoreScene = async (sceneId: string) => {
    if (!projectId) return
    const scene = scenes.find(s => s.id === sceneId)
    if (!scene) return
    const choices = await loadAllChoicesForScene(sceneId)
    const openChoices = choices.filter(c => !c.leadsToSceneId)
    dispatch({ type: 'SET_CURRENT_SCENE', payload: { scene, choices: openChoices } })
  }

  const handleCreateSavepoint = async () => {
    if (!projectId || !state.currentScene) return
    const name = `Scene ${scenes.length}`
    await createSavepoint(projectId, state.currentScene.id, name, '', activeBranchId)
    await loadData()
  }

  const activeBranch = branches.find(b => b.isActive)

  return (
    <div className="min-h-screen bg-[#1A1A3E] px-4 py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#F8F6F0] flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#F5A623]" />
              Story Map
            </h1>
            {activeBranch && (
              <p className="text-xs text-[#F8F6F0]/40 mt-0.5">
                Active branch: <span className="text-[#F5A623]">{activeBranch.name}</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {state.currentScene && (
              <Button variant="ghost" size="sm" onClick={handleCreateSavepoint}>
                <Bookmark className="w-3.5 h-3.5" /> Save Point
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setNewBranchModal(true)}>
              <Plus className="w-3.5 h-3.5" /> New Branch
            </Button>
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_PLAY_TAB', payload: 'play' })}>
              <Wand2 className="w-3.5 h-3.5" /> Play
            </Button>
          </div>
        </div>

        {/* Git-style graph */}
        <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl p-4">
          <p className="text-xs font-medium text-[#F8F6F0]/50 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5" /> Scene Graph
          </p>
          <GitBranchMap scenes={scenes} onRestore={handleRestoreScene} />
        </div>

        {/* Branches list */}
        <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#3D3D7A]">
            <p className="text-sm font-semibold text-[#F8F6F0]/80 flex items-center gap-1.5">
              <GitBranch className="w-4 h-4 text-[#F5A623]" /> Branches
              <span className="text-xs font-normal text-[#F8F6F0]/30">({branches.length})</span>
            </p>
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className={`w-3.5 h-3.5 ${loadingBranches ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {loadingBranches ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#F5A623] animate-spin" />
            </div>
          ) : branches.length === 0 ? (
            <div className="text-center py-8 text-[#F8F6F0]/25 text-sm">
              No branches yet. Start playing to create the main branch.
            </div>
          ) : (
            <div className="divide-y divide-[#3D3D7A]/50">
              {branches.map(branch => (
                <div key={branch.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${branch.isActive ? 'bg-[#F5A623]' : 'bg-[#3D3D7A]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#F8F6F0]">{branch.name}</span>
                      {branch.isActive && <Badge variant="gold">active</Badge>}
                    </div>
                    {branch.description && (
                      <p className="text-xs text-[#F8F6F0]/40 truncate mt-0.5">{branch.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!branch.isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={switchingBranch === branch.id}
                        onClick={() => handleSwitchBranch(branch.id)}
                        className="text-xs"
                      >
                        {switchingBranch === branch.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <CheckCircle className="w-3.5 h-3.5" />}
                        Switch
                      </Button>
                    )}
                    {!branch.isActive && (
                      <button
                        onClick={() => handleDeleteBranch(branch)}
                        className="p-1.5 text-[#F8F6F0]/20 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-400/10"
                        title="Delete branch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Savepoints list */}
        <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#3D3D7A]">
            <p className="text-sm font-semibold text-[#F8F6F0]/80 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-[#F5A623]" /> Savepoints
              <span className="text-xs font-normal text-[#F8F6F0]/30">({savepoints.length})</span>
            </p>
          </div>

          {savepoints.length === 0 ? (
            <div className="text-center py-8 text-[#F8F6F0]/25 text-sm">
              No savepoints yet. Use "Save Point" in the Play tab to bookmark a scene.
            </div>
          ) : (
            <div className="divide-y divide-[#3D3D7A]/50">
              {savepoints.map(sp => {
                const scene = scenes.find(s => s.id === sp.sceneId)
                const branch = branches.find(b => b.id === sp.branchId)
                return (
                  <div key={sp.id} className="flex items-start gap-3 px-4 py-3">
                    <Bookmark className="w-4 h-4 text-[#F5A623] shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#F8F6F0]">{sp.name}</span>
                        {branch && (
                          <Badge variant="default" className="text-[10px]">{branch.name}</Badge>
                        )}
                      </div>
                      {sp.description && (
                        <p className="text-xs text-[#F8F6F0]/40 mt-0.5">{sp.description}</p>
                      )}
                      {scene && (
                        <p className="text-[10px] text-[#F8F6F0]/25 mt-0.5">
                          at: {scene.title}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBranchFromSavepoint(sp)}
                        className="text-xs"
                      >
                        <GitBranch className="w-3.5 h-3.5" /> Branch
                      </Button>
                      {scene && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestoreScene(sp.sceneId)}
                          className="text-xs"
                        >
                          ↩ Go
                        </Button>
                      )}
                      <button
                        onClick={() => handleDeleteSavepoint(sp.id)}
                        className="p-1.5 text-[#F8F6F0]/20 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-red-400/10"
                        title="Delete savepoint"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {newBranchModal && (
        <NewBranchModal
          onSave={handleCreateBranch}
          onClose={() => setNewBranchModal(false)}
        />
      )}
      {branchFromSavepoint && (
        <BranchFromSavepointModal
          savepoint={branchFromSavepoint}
          onSave={(name, desc) => handleBranchFromSavepoint(branchFromSavepoint, name, desc)}
          onClose={() => setBranchFromSavepoint(null)}
        />
      )}
    </div>
  )
}
