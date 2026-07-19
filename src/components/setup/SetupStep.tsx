import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStory } from '@/contexts/StoryContext'
import { createProject, generateScene } from '@/services/storyService'
import type { ProjectSetup, Character } from '@/types/story'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Plus, Trash2, BookOpen, User, Shield, Wand2 } from 'lucide-react'

const GENRES = ['Fantasy', 'Sci-Fi', 'Mystery', 'Horror', 'Romance', 'Thriller', 'Historical', 'Adventure']
const TONES = ['Epic', 'Dark', 'Whimsical', 'Gritty', 'Hopeful', 'Mysterious', 'Comedic', 'Tense']
const DEFAULT_GUARDRAILS = [
  'No explicit violence',
  'Maintain character consistency',
  'No plot contradictions',
  'Keep lore consistent',
]

const emptyChar = (): Character => ({
  name: '',
  role: 'supporting',
  description: '',
  traits: [],
  backstory: '',
})

export function SetupStep() {
  const { user } = useAuth()
  const { dispatch } = useStory()
  const [activePanel, setActivePanel] = useState<'project' | 'characters' | 'guardrails'>('project')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [setup, setSetup] = useState<ProjectSetup>({
    title: '',
    genre: 'Fantasy',
    setting: '',
    tone: 'Epic',
    guardrails: [...DEFAULT_GUARDRAILS],
    characters: [],
  })

  const [editingChar, setEditingChar] = useState<Character>(emptyChar())
  const [charTraitInput, setCharTraitInput] = useState('')
  const [customGuardrail, setCustomGuardrail] = useState('')

  const updateSetup = (patch: Partial<ProjectSetup>) => setSetup(s => ({ ...s, ...patch }))

  // ── Characters ──────────────────────────────────────────────────────────────
  const addTrait = () => {
    if (!charTraitInput.trim()) return
    setEditingChar(c => ({ ...c, traits: [...c.traits, charTraitInput.trim()] }))
    setCharTraitInput('')
  }

  const removeTrait = (t: string) =>
    setEditingChar(c => ({ ...c, traits: c.traits.filter(x => x !== t) }))

  const saveCharacter = () => {
    if (!editingChar.name.trim()) return
    updateSetup({ characters: [...setup.characters, { ...editingChar, id: crypto.randomUUID() }] })
    setEditingChar(emptyChar())
    setCharTraitInput('')
  }

  const removeCharacter = (id: string | undefined) =>
    updateSetup({ characters: setup.characters.filter(c => c.id !== id) })

  // ── Guardrails ───────────────────────────────────────────────────────────────
  const addGuardrail = () => {
    if (!customGuardrail.trim()) return
    updateSetup({ guardrails: [...setup.guardrails, customGuardrail.trim()] })
    setCustomGuardrail('')
  }

  const removeGuardrail = (g: string) =>
    updateSetup({ guardrails: setup.guardrails.filter(x => x !== g) })

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleLaunch = async () => {
    if (!setup.title.trim() || !setup.setting.trim()) {
      setError('Title and setting are required.')
      return
    }
    if (setup.characters.length === 0) {
      setError('Add at least one character.')
      return
    }
    if (!user) return

    setLoading(true)
    setError(null)
    dispatch({ type: 'SET_GENERATING', payload: true })

    try {
      const projectId = await createProject(setup, user.id)
      dispatch({ type: 'SET_PROJECT', payload: { projectId, setup } })

      const result = await generateScene(projectId, setup)
      dispatch({ type: 'ADD_SCENE', payload: { scene: result.scene, choices: result.choices } })
      if (result.stateUpdates) dispatch({ type: 'SET_STORY_STATE', payload: result.stateUpdates as never })
      dispatch({ type: 'SET_STEP', payload: 'play' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      dispatch({ type: 'SET_GENERATING', payload: false })
    } finally {
      setLoading(false)
    }
  }

  const panels = [
    { id: 'project' as const, label: 'Project', icon: BookOpen },
    { id: 'characters' as const, label: 'Characters', icon: User },
    { id: 'guardrails' as const, label: 'Guardrails', icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-[#1A1A3E] px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Wand2 className="w-6 h-6 text-[#F5A623]" />
            <h1 className="text-3xl font-bold text-[#F8F6F0]">New Story</h1>
          </div>
          <p className="text-[#F8F6F0]/50">Set up your narrative world before the AI begins</p>
        </div>

        {/* Step tabs */}
        <div className="flex gap-1 p-1 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl mb-6">
          {panels.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePanel(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activePanel === id
                  ? 'bg-[#F5A623] text-[#1A1A3E]'
                  : 'text-[#F8F6F0]/60 hover:text-[#F8F6F0] hover:bg-[#3D3D7A]/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Panel: Project ─────────────────────────────────────────────────── */}
        {activePanel === 'project' && (
          <Card>
            <CardHeader>
              <CardTitle>Story Overview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                label="Story Title"
                placeholder="The Shattered Realm..."
                value={setup.title}
                onChange={e => updateSetup({ title: e.target.value })}
              />
              <Textarea
                label="Setting"
                placeholder="A crumbling empire at the edge of an interdimensional rift..."
                rows={3}
                value={setup.setting}
                onChange={e => updateSetup({ setting: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#F8F6F0]/80">Genre</label>
                  <select
                    value={setup.genre}
                    onChange={e => updateSetup({ genre: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50"
                  >
                    {GENRES.map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#F8F6F0]/80">Tone</label>
                  <select
                    value={setup.tone}
                    onChange={e => updateSetup({ tone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50"
                  >
                    {TONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setActivePanel('characters')}>
                  Next: Characters →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Panel: Characters ──────────────────────────────────────────────── */}
        {activePanel === 'characters' && (
          <div className="flex flex-col gap-4">
            {/* Existing characters */}
            {setup.characters.length > 0 && (
              <div className="flex flex-col gap-2">
                {setup.characters.map(char => (
                  <div
                    key={char.id}
                    className="flex items-center gap-3 p-3 bg-[#2D2D5E]/50 border border-[#3D3D7A] rounded-xl"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#F5A623]/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#F5A623]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#F8F6F0] text-sm">{char.name}</p>
                      <p className="text-xs text-[#F8F6F0]/50 truncate">{char.description}</p>
                    </div>
                    <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'}>
                      {char.role}
                    </Badge>
                    <button onClick={() => removeCharacter(char.id)} className="text-[#F8F6F0]/30 hover:text-red-400 transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add character form */}
            <Card>
              <CardHeader>
                <CardTitle>Add Character</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Name"
                    placeholder="Lyra Shadowmend"
                    value={editingChar.name}
                    onChange={e => setEditingChar(c => ({ ...c, name: e.target.value }))}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#F8F6F0]/80">Role</label>
                    <select
                      value={editingChar.role}
                      onChange={e => setEditingChar(c => ({ ...c, role: e.target.value as Character['role'] }))}
                      className="w-full px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50"
                    >
                      <option value="protagonist">Protagonist</option>
                      <option value="antagonist">Antagonist</option>
                      <option value="supporting">Supporting</option>
                    </select>
                  </div>
                </div>
                <Textarea
                  label="Description"
                  placeholder="A rogue scholar with silver eyes and a hidden agenda..."
                  rows={2}
                  value={editingChar.description}
                  onChange={e => setEditingChar(c => ({ ...c, description: e.target.value }))}
                />
                <Textarea
                  label="Backstory"
                  placeholder="Raised in the floating libraries of Verath, she..."
                  rows={2}
                  value={editingChar.backstory}
                  onChange={e => setEditingChar(c => ({ ...c, backstory: e.target.value }))}
                />
                {/* Traits */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#F8F6F0]/80">Traits</label>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 text-sm"
                      placeholder="Brave, Cunning..."
                      value={charTraitInput}
                      onChange={e => setCharTraitInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTrait())}
                    />
                    <Button size="sm" variant="secondary" onClick={addTrait}><Plus className="w-3 h-3" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {editingChar.traits.map(t => (
                      <button
                        key={t}
                        onClick={() => removeTrait(t)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-400/30 transition-colors cursor-pointer"
                      >
                        {t} ×
                      </button>
                    ))}
                  </div>
                </div>
                <Button variant="secondary" onClick={saveCharacter} disabled={!editingChar.name.trim()}>
                  <Plus className="w-4 h-4" /> Add Character
                </Button>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setActivePanel('project')}>← Back</Button>
              <Button onClick={() => setActivePanel('guardrails')} disabled={setup.characters.length === 0}>
                Next: Guardrails →
              </Button>
            </div>
          </div>
        )}

        {/* ── Panel: Guardrails ──────────────────────────────────────────────── */}
        {activePanel === 'guardrails' && (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#F5A623]" />
                  Story Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-[#F8F6F0]/50 text-sm mb-1">
                  These rules are enforced by the AI during generation to keep your story consistent.
                </p>
                <div className="flex flex-col gap-2">
                  {setup.guardrails.map(g => (
                    <div key={g} className="flex items-center gap-2 p-2.5 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-lg">
                      <Shield className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />
                      <span className="flex-1 text-sm text-[#F8F6F0]/80">{g}</span>
                      <button onClick={() => removeGuardrail(g)} className="text-[#F8F6F0]/30 hover:text-red-400 transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <input
                    className="flex-1 px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 text-sm"
                    placeholder="Custom rule..."
                    value={customGuardrail}
                    onChange={e => setCustomGuardrail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGuardrail())}
                  />
                  <Button size="sm" variant="secondary" onClick={addGuardrail}><Plus className="w-3 h-3" /></Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setActivePanel('characters')}>← Back</Button>
              <Button loading={loading} size="lg" onClick={handleLaunch}>
                <Wand2 className="w-4 h-4" />
                Launch Story
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
