import { useState, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStory } from '@/contexts/StoryContext'
import { createProject, generateScene } from '@/services/storyService'
import { supabase } from '@/lib/supabase'
import type { ProjectSetup, Character } from '@/types/story'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import {
  Plus, Trash2, BookOpen, User, Shield, Wand2,
  Pencil, Check, X, Sparkles, ImageIcon, AlertTriangle,
  Search, ChevronLeft, ChevronRight,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_GENRES = ['Fantasy', 'Sci-Fi', 'Mystery', 'Horror', 'Romance', 'Thriller', 'Historical', 'Adventure']
const PRESET_TONES  = ['Epic', 'Dark', 'Whimsical', 'Gritty', 'Hopeful', 'Mysterious', 'Comedic', 'Tense']
const PAGE_SIZE = 10

const SUGGESTED_STORY_GUARDRAILS = [
  'Keep the story focused on the main narrative arc',
  'No explicit sexual content',
  'Avoid plot contradictions with established lore',
  'Maintain a consistent world-building logic',
  'The protagonist must face genuine consequences for their choices',
  'Supporting characters should have meaningful roles',
  'Foreshadowing should be subtle, not on-the-nose',
  'Magic/technology rules must remain internally consistent',
  'No sudden character deaths without narrative setup',
  'Dialogue must match each character\'s established voice',
  'All introduced mysteries must have resolvable answers',
  'The story\'s tone must remain consistent throughout',
]

const SUGGESTED_CHAR_GUARDRAILS = (name: string) => [
  `${name} must remain loyal to their core motivation`,
  `${name} should not suddenly change personality without a narrative reason`,
  `${name}'s speech pattern and vocabulary should stay consistent`,
  `${name} cannot gain abilities they were not established to have`,
  `${name}'s moral compass should only shift through explicit story events`,
]

const ROLE_TRAIT_SUGGESTIONS: Record<string, string[]> = {
  protagonist: ['Brave', 'Curious', 'Stubborn', 'Empathetic', 'Resourceful', 'Idealistic', 'Determined', 'Conflicted'],
  antagonist:  ['Calculating', 'Charismatic', 'Ruthless', 'Intelligent', 'Manipulative', 'Ambitious', 'Patient', 'Visionary'],
  supporting:  ['Loyal', 'Witty', 'Cautious', 'Knowledgeable', 'Sarcastic', 'Gentle', 'Reliable', 'Observant'],
}

// ── AI helpers ────────────────────────────────────────────────────────────────

async function aiPolish(text: string, context: 'setting' | 'character_description' | 'guardrail'): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-polish', { body: { text, context } })
  if (error || !data?.polished) throw new Error(error?.message ?? 'Polish failed')
  return data.polished as string
}

async function suggestTraits(characterName: string, role: string, existing: string[]): Promise<string[]> {
  const { data, error } = await supabase.functions.invoke('suggest-traits', {
    body: { characterName, role, existingTraits: existing },
  })
  if (error) return ROLE_TRAIT_SUGGESTIONS[role] ?? []
  return (data?.suggestions as string[]) ?? ROLE_TRAIT_SUGGESTIONS[role] ?? []
}

// ── Pagination helper ─────────────────────────────────────────────────────────

function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <div className="flex items-center gap-2 mt-3">
      <button
        disabled={page === 0}
        onClick={() => onPage(page - 1)}
        className="p-1 rounded text-[#F8F6F0]/40 hover:text-[#F8F6F0] disabled:opacity-20 cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="text-xs text-[#F8F6F0]/40">
        {page + 1} / {pages}
      </span>
      <button
        disabled={page >= pages - 1}
        onClick={() => onPage(page + 1)}
        className="p-1 rounded text-[#F8F6F0]/40 hover:text-[#F8F6F0] disabled:opacity-20 cursor-pointer"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Polish confirm modal ──────────────────────────────────────────────────────

function PolishModal({ original, polished, onAccept, onReject }: {
  original: string; polished: string; onAccept: () => void; onReject: () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onReject}>
      <div className="w-full max-w-lg bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#3D3D7A] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#F5A623]" />
          <h3 className="font-bold text-[#F8F6F0]">AI Polish — Review Changes</h3>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-1.5">Original</p>
            <p className="text-sm text-[#F8F6F0]/50 bg-[#2D2D5E]/30 rounded-lg p-3 leading-relaxed">{original}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[#F5A623]/80 uppercase tracking-wide mb-1.5">Polished</p>
            <p className="text-sm text-[#F8F6F0]/90 bg-[#F5A623]/5 border border-[#F5A623]/20 rounded-lg p-3 leading-relaxed">{polished}</p>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[#3D3D7A] flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onReject}><X className="w-3.5 h-3.5" /> Discard</Button>
          <Button size="sm" onClick={onAccept}><Check className="w-3.5 h-3.5" /> Apply Changes</Button>
        </div>
      </div>
    </div>
  )
}

// ── Polish button ─────────────────────────────────────────────────────────────

function PolishButton({ text, context, onApply }: {
  text: string
  context: 'setting' | 'character_description' | 'guardrail'
  onApply: (polished: string) => void
}) {
  const [polishing, setPolishing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  const handlePolish = async () => {
    if (!text.trim() || polishing) return
    setPolishing(true)
    try { setPreview(await aiPolish(text, context)) }
    catch { /* silent */ }
    finally { setPolishing(false) }
  }

  return (
    <>
      <button
        type="button"
        title="AI Polish"
        disabled={!text.trim() || polishing}
        onClick={handlePolish}
        className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
          polishing
            ? 'text-[#F5A623] animate-pulse'
            : 'text-[#F8F6F0]/30 hover:text-[#F5A623] hover:bg-[#F5A623]/10'
        }`}
      >
        <Wand2 className="w-3.5 h-3.5" />
      </button>
      {preview && (
        <PolishModal
          original={text}
          polished={preview}
          onAccept={() => { onApply(preview); setPreview(null) }}
          onReject={() => setPreview(null)}
        />
      )}
    </>
  )
}

// ── Portrait picker ───────────────────────────────────────────────────────────

function PortraitPicker({ name, portraitUrl, onChange }: {
  name: string; portraitUrl?: string; onChange: (url: string | undefined) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const initials = name.trim() ? name.trim().charAt(0).toUpperCase() : '?'

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onChange(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-16 h-16 rounded-xl border-2 border-dashed border-[#3D3D7A] flex items-center justify-center cursor-pointer hover:border-[#F5A623]/60 transition-colors relative overflow-hidden shrink-0"
        onClick={() => inputRef.current?.click()}
      >
        {portraitUrl ? (
          <img src={portraitUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-[#F5A623]/60">{initials}</span>
            <ImageIcon className="w-3 h-3 text-[#F8F6F0]/20" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-[#F8F6F0]/50">Portrait <span className="text-[#F8F6F0]/30">(optional)</span></p>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => inputRef.current?.click()}
            className="text-xs px-2 py-1 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-lg text-[#F8F6F0]/60 hover:text-[#F8F6F0] hover:border-[#F5A623]/40 cursor-pointer transition-colors"
          >Upload</button>
          {portraitUrl && (
            <button type="button" onClick={() => onChange(undefined)}
              className="text-xs px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400/60 hover:text-red-400 cursor-pointer transition-colors"
            >Remove</button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ── Character form (left panel) ───────────────────────────────────────────────

interface CharFormProps {
  initial: Character
  onSave: (c: Character) => void
  onCancel: () => void
  isEdit?: boolean
}

function CharacterForm({ initial, onSave, onCancel, isEdit }: CharFormProps) {
  const [char, setChar] = useState<Character>(initial)
  const [traitInput, setTraitInput] = useState('')
  const [traitSuggestions, setTraitSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [charGuardrailInput, setCharGuardrailInput] = useState('')

  const update = (patch: Partial<Character>) => setChar(c => ({ ...c, ...patch }))

  const addTrait = (t: string) => {
    const trimmed = t.trim()
    if (!trimmed || char.traits.includes(trimmed)) return
    update({ traits: [...char.traits, trimmed] })
    setTraitInput('')
    setTraitSuggestions(s => s.filter(x => x !== trimmed))
  }

  const removeTrait = (t: string) => update({ traits: char.traits.filter(x => x !== t) })

  const loadSuggestions = async () => {
    setLoadingSuggestions(true)
    const suggestions = await suggestTraits(char.name, char.role, char.traits)
    setTraitSuggestions(suggestions.filter(s => !char.traits.includes(s)))
    setLoadingSuggestions(false)
  }

  const addCharGuardrail = (rule: string) => {
    const trimmed = rule.trim()
    if (!trimmed) return
    update({ charGuardrails: [...(char.charGuardrails ?? []), trimmed] })
    setCharGuardrailInput('')
  }

  const removeCharGuardrail = (rule: string) =>
    update({ charGuardrails: (char.charGuardrails ?? []).filter(r => r !== rule) })

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-1">
      {/* Portrait + name + role */}
      <PortraitPicker name={char.name} portraitUrl={char.portraitUrl} onChange={url => update({ portraitUrl: url })} />

      <Input
        label="Name"
        placeholder="Lyra Shadowmend"
        value={char.name}
        onChange={e => update({ name: e.target.value })}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[#F8F6F0]/80">Role</label>
        <select
          value={char.role}
          onChange={e => update({ role: e.target.value as Character['role'] })}
          className="w-full px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 text-sm"
        >
          <option value="protagonist">Protagonist</option>
          <option value="antagonist">Antagonist</option>
          <option value="supporting">Supporting</option>
        </select>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#F8F6F0]/80">Description</label>
          <PolishButton text={char.description} context="character_description" onApply={polished => update({ description: polished })} />
        </div>
        <textarea
          className="w-full px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 resize-none focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 text-sm"
          placeholder="A rogue scholar with silver eyes and a hidden agenda..."
          rows={2}
          value={char.description}
          onChange={e => update({ description: e.target.value })}
        />
      </div>

      {/* Traits */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-[#F8F6F0]/80">Traits</label>
          <button type="button" onClick={loadSuggestions} disabled={loadingSuggestions}
            className="flex items-center gap-1 text-xs text-[#F5A623]/70 hover:text-[#F5A623] transition-colors cursor-pointer disabled:opacity-40"
          >
            <Sparkles className={`w-3 h-3 ${loadingSuggestions ? 'animate-spin' : ''}`} />
            {loadingSuggestions ? 'Thinking…' : 'Suggest'}
          </button>
        </div>
        {traitSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-[#F5A623]/5 border border-[#F5A623]/20 rounded-lg">
            <p className="w-full text-[10px] text-[#F5A623]/60 mb-0.5">Click to add:</p>
            {traitSuggestions.map(s => (
              <button key={s} type="button" onClick={() => addTrait(s)}
                className="px-2 py-0.5 rounded-full text-xs bg-[#F5A623]/10 text-[#F5A623]/80 border border-[#F5A623]/20 hover:bg-[#F5A623]/20 cursor-pointer transition-colors"
              >+ {s}</button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 text-sm"
            placeholder="Type a trait and press Enter…"
            value={traitInput}
            onChange={e => setTraitInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTrait(traitInput))}
          />
          <Button size="sm" variant="secondary" onClick={() => addTrait(traitInput)}><Plus className="w-3 h-3" /></Button>
        </div>
        {char.traits.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {char.traits.map(t => (
              <button key={t} type="button" onClick={() => removeTrait(t)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30 hover:bg-red-500/15 hover:text-red-400 hover:border-red-400/30 transition-colors cursor-pointer"
              >{t} ×</button>
            ))}
          </div>
        )}
      </div>

      {/* Char guardrails */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-[#F8F6F0]/80 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-[#F5A623]" /> Character Guardrails <span className="text-xs font-normal text-[#F8F6F0]/40">(optional)</span>
        </label>
        {char.name && (
          <div className="flex flex-col gap-1 p-2 bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-lg">
            <p className="text-[10px] text-[#F8F6F0]/40 mb-0.5">Quick add:</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_CHAR_GUARDRAILS(char.name)
                .filter(s => !(char.charGuardrails ?? []).includes(s))
                .slice(0, 3)
                .map(s => (
                  <button key={s} type="button" onClick={() => addCharGuardrail(s)}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-[#3D3D7A]/60 text-[#F8F6F0]/60 border border-[#3D3D7A] hover:bg-[#F5A623]/10 hover:text-[#F5A623]/80 hover:border-[#F5A623]/30 cursor-pointer transition-colors"
                  >+ {s.length > 45 ? s.slice(0, 45) + '…' : s}</button>
                ))}
            </div>
          </div>
        )}
        {(char.charGuardrails ?? []).map(rule => (
          <div key={rule} className="flex items-center gap-2 px-3 py-2 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-lg">
            <AlertTriangle className="w-3 h-3 text-[#F5A623] shrink-0" />
            <span className="flex-1 text-xs text-[#F8F6F0]/70">{rule}</span>
            <button type="button" onClick={() => removeCharGuardrail(rule)} className="text-[#F8F6F0]/25 hover:text-red-400 cursor-pointer transition-colors">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 text-sm"
            placeholder={`e.g. "${char.name || 'Character'} must never betray allies"`}
            value={charGuardrailInput}
            onChange={e => setCharGuardrailInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCharGuardrail(charGuardrailInput))}
          />
          <Button size="sm" variant="secondary" onClick={() => addCharGuardrail(charGuardrailInput)}><Plus className="w-3 h-3" /></Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 sticky bottom-0 bg-[#1A1A3E] py-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" className="flex-1" disabled={!char.name.trim()}
          onClick={() => onSave({ ...char, id: char.id ?? crypto.randomUUID() })}
        >
          <Check className="w-3.5 h-3.5" />
          {isEdit ? 'Save Changes' : 'Add Character'}
        </Button>
      </div>
    </div>
  )
}

const emptyChar = (): Character => ({ name: '', role: 'supporting', description: '', traits: [], charGuardrails: [] })

// ── Characters panel (two-panel layout) ──────────────────────────────────────

function CharactersPanel({ setup, updateSetup }: { setup: ProjectSetup; updateSetup: (p: Partial<ProjectSetup>) => void }) {
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(0)

  const saveChar = (c: Character) => {
    if (editingId) {
      updateSetup({ characters: setup.characters.map(x => x.id === editingId ? c : x) })
    } else {
      updateSetup({ characters: [...setup.characters, c] })
    }
    setShowForm(false)
    setEditingId(null)
  }

  const startEdit = (id: string) => { setEditingId(id); setShowForm(true) }
  const removeChar = (id: string | undefined) => updateSetup({ characters: setup.characters.filter(c => c.id !== id) })

  const filtered = setup.characters.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.toLowerCase().includes(search.toLowerCase())
  )
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="flex gap-0 h-full">
      {/* Left — form */}
      <div className="w-[45%] border-r border-[#3D3D7A] pr-5 overflow-y-auto">
        <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-4">
          {showForm ? (editingId ? 'Edit Character' : 'New Character') : 'Character Details'}
        </p>
        {showForm ? (
          <CharacterForm
            initial={editingId ? setup.characters.find(c => c.id === editingId)! : emptyChar()}
            onSave={saveChar}
            onCancel={() => { setShowForm(false); setEditingId(null) }}
            isEdit={!!editingId}
          />
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-[#3D3D7A] rounded-xl text-[#F8F6F0]/40 hover:border-[#F5A623]/40 hover:text-[#F5A623]/60 transition-colors cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4" /> Add Character
          </button>
        )}
      </div>

      {/* Right — list */}
      <div className="flex-1 pl-5 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-lg">
            <Search className="w-3.5 h-3.5 text-[#F8F6F0]/30 shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none"
              placeholder="Search characters…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
            />
          </div>
          <span className="text-xs text-[#F8F6F0]/30 shrink-0">{setup.characters.length} total</span>
        </div>

        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {paged.length === 0 && (
            <p className="text-sm text-[#F8F6F0]/25 text-center py-8">
              {setup.characters.length === 0 ? 'No characters yet.' : 'No results.'}
            </p>
          )}
          {paged.map(char => (
            <div key={char.id} className="flex items-center gap-3 p-3 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl">
              <div className="w-9 h-9 rounded-lg overflow-hidden border border-[#3D3D7A] shrink-0 flex items-center justify-center bg-[#F5A623]/10">
                {char.portraitUrl
                  ? <img src={char.portraitUrl} alt={char.name} className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold text-[#F5A623]/60">{char.name.charAt(0).toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#F8F6F0] text-sm truncate">{char.name}</p>
                <p className="text-xs text-[#F8F6F0]/40 truncate">{char.description || '—'}</p>
              </div>
              <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'} className="text-xs shrink-0">
                {char.role}
              </Badge>
              <button onClick={() => startEdit(char.id!)} className="text-[#F8F6F0]/30 hover:text-[#F5A623] transition-colors cursor-pointer shrink-0">
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => removeChar(char.id)} className="text-[#F8F6F0]/30 hover:text-red-400 transition-colors cursor-pointer shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Pagination total={filtered.length} page={page} onPage={setPage} />
      </div>
    </div>
  )
}

// ── Guardrails panel (two-panel layout) ───────────────────────────────────────

function GuardrailsPanel({ setup, updateSetup }: { setup: ProjectSetup; updateSetup: (p: Partial<ProjectSetup>) => void }) {
  const [customGuardrail, setCustomGuardrail] = useState('')
  const [searchSugg, setSearchSugg]           = useState('')
  const [searchChosen, setSearchChosen]        = useState('')
  const [suggPage, setSuggPage]               = useState(0)
  const [chosenPage, setChosenPage]            = useState(0)

  const addGuardrail = (rule: string) => {
    const trimmed = rule.trim()
    if (!trimmed || setup.guardrails.includes(trimmed)) return
    updateSetup({ guardrails: [...setup.guardrails, trimmed] })
    setCustomGuardrail('')
  }

  const removeGuardrail = (g: string) =>
    updateSetup({ guardrails: setup.guardrails.filter(x => x !== g) })

  const availableSuggestions = SUGGESTED_STORY_GUARDRAILS.filter(
    s => !setup.guardrails.includes(s) && s.toLowerCase().includes(searchSugg.toLowerCase())
  )
  const chosenFiltered = setup.guardrails.filter(g =>
    g.toLowerCase().includes(searchChosen.toLowerCase())
  )

  const pagedSugg   = availableSuggestions.slice(suggPage * PAGE_SIZE,  (suggPage + 1) * PAGE_SIZE)
  const pagedChosen = chosenFiltered.slice(chosenPage * PAGE_SIZE, (chosenPage + 1) * PAGE_SIZE)

  return (
    <div className="flex gap-0 h-full">
      {/* Left — suggestions */}
      <div className="w-[50%] border-r border-[#3D3D7A] pr-5 flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">Suggested Rules</p>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-lg mb-3">
            <Search className="w-3.5 h-3.5 text-[#F8F6F0]/30 shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none"
              placeholder="Search suggestions…"
              value={searchSugg}
              onChange={e => { setSearchSugg(e.target.value); setSuggPage(0) }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {pagedSugg.length === 0 && (
            <p className="text-xs text-[#F8F6F0]/25 text-center py-4">
              {availableSuggestions.length === 0 ? 'All suggestions added ✓' : 'No results.'}
            </p>
          )}
          {pagedSugg.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => addGuardrail(s)}
              className="text-left text-xs px-3 py-2.5 bg-[#1A1A3E]/60 border border-[#3D3D7A] rounded-lg text-[#F8F6F0]/60 hover:border-[#F5A623]/40 hover:text-[#F8F6F0]/90 cursor-pointer transition-colors flex items-center gap-2"
            >
              <Plus className="w-3 h-3 text-[#F5A623]/50 shrink-0" /> {s}
            </button>
          ))}
        </div>
        <Pagination total={availableSuggestions.length} page={suggPage} onPage={setSuggPage} />

        {/* Custom input */}
        <div className="border-t border-[#3D3D7A] pt-3 flex flex-col gap-2">
          <p className="text-xs text-[#F8F6F0]/40 font-medium">Custom rule</p>
          <div className="flex gap-2 items-center">
            <input
              className="flex-1 px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 text-sm"
              placeholder="e.g. The story must stay grounded…"
              value={customGuardrail}
              onChange={e => setCustomGuardrail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGuardrail(customGuardrail))}
            />
            <PolishButton text={customGuardrail} context="guardrail" onApply={polished => setCustomGuardrail(polished)} />
            <Button size="sm" variant="secondary" onClick={() => addGuardrail(customGuardrail)}><Plus className="w-3 h-3" /></Button>
          </div>
        </div>
      </div>

      {/* Right — chosen */}
      <div className="flex-1 pl-5 flex flex-col gap-3">
        <div>
          <p className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-3">
            Active Rules <span className="text-[#F5A623]/60 ml-1">({setup.guardrails.length})</span>
          </p>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-lg mb-3">
            <Search className="w-3.5 h-3.5 text-[#F8F6F0]/30 shrink-0" />
            <input
              className="flex-1 bg-transparent text-sm text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none"
              placeholder="Search active rules…"
              value={searchChosen}
              onChange={e => { setSearchChosen(e.target.value); setChosenPage(0) }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {pagedChosen.length === 0 && (
            <p className="text-xs text-[#F8F6F0]/25 text-center py-4">
              {setup.guardrails.length === 0 ? 'No guardrails added yet.' : 'No results.'}
            </p>
          )}
          {pagedChosen.map(g => (
            <div key={g} className="flex items-center gap-2 p-2.5 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-lg">
              <Shield className="w-3.5 h-3.5 text-[#F5A623] shrink-0" />
              <span className="flex-1 text-sm text-[#F8F6F0]/80">{g}</span>
              <button onClick={() => removeGuardrail(g)} className="text-[#F8F6F0]/30 hover:text-red-400 transition-colors cursor-pointer shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <Pagination total={chosenFiltered.length} page={chosenPage} onPage={setChosenPage} />
      </div>
    </div>
  )
}

// ── Main SetupStep ────────────────────────────────────────────────────────────

export function SetupStep() {
  const { user } = useAuth()
  const { dispatch } = useStory()
  const [activePanel, setActivePanel] = useState<'project' | 'characters' | 'guardrails'>('project')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [setup, setSetup] = useState<ProjectSetup>({
    title: '',
    genre: 'Fantasy',
    setting: '',
    tone: 'Epic',
    guardrails: [],
    characters: [],
  })
  const [customGenre, setCustomGenre] = useState('')
  const [customTone, setCustomTone]   = useState('')
  const [isCustomGenre, setIsCustomGenre] = useState(false)
  const [isCustomTone,  setIsCustomTone]  = useState(false)

  const updateSetup = (patch: Partial<ProjectSetup>) => setSetup(s => ({ ...s, ...patch }))
  const effectiveGenre = isCustomGenre ? customGenre : setup.genre
  const effectiveTone  = isCustomTone  ? customTone  : setup.tone

  const handleLaunch = async () => {
    const finalSetup: ProjectSetup = {
      ...setup,
      genre: effectiveGenre || setup.genre,
      tone:  effectiveTone  || setup.tone,
    }
    if (!finalSetup.title.trim() || !finalSetup.setting.trim()) {
      setError('Title and synopsis are required.')
      return
    }
    if (finalSetup.characters.length === 0) {
      setError('Add at least one character.')
      return
    }
    if (!user) return
    setLoading(true)
    setError(null)
    dispatch({ type: 'SET_GENERATING', payload: true })
    try {
      const projectId = await createProject(finalSetup, user.id)
      dispatch({ type: 'SET_PROJECT', payload: { projectId, setup: finalSetup } })
      const result = await generateScene(projectId, finalSetup)
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
    { id: 'project'    as const, label: 'Project',    icon: BookOpen },
    { id: 'characters' as const, label: 'Characters', icon: User    },
    { id: 'guardrails' as const, label: 'Guardrails', icon: Shield  },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-[75vw] h-[75vh] min-w-[640px] min-h-[480px] bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3D3D7A] shrink-0">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#F5A623]" />
            <h2 className="text-lg font-bold text-[#F8F6F0]">New Story</h2>
          </div>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="p-1.5 rounded-lg text-[#F8F6F0]/40 hover:text-[#F8F6F0] hover:bg-[#2D2D5E] transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 py-3 border-b border-[#3D3D7A] shrink-0 bg-[#12122A]/40">
          {panels.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePanel(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activePanel === id
                  ? 'bg-[#F5A623] text-[#1A1A3E]'
                  : 'text-[#F8F6F0]/60 hover:text-[#F8F6F0] hover:bg-[#3D3D7A]/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id === 'characters' && setup.characters.length > 0 && (
                <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${activePanel === id ? 'bg-[#1A1A3E]/20' : 'bg-[#3D3D7A]/60'}`}>
                  {setup.characters.length}
                </span>
              )}
              {id === 'guardrails' && setup.guardrails.length > 0 && (
                <span className={`ml-0.5 text-xs px-1.5 py-0.5 rounded-full ${activePanel === id ? 'bg-[#1A1A3E]/20' : 'bg-[#3D3D7A]/60'}`}>
                  {setup.guardrails.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Panel content — no inner container, fields go directly */}
        <div className="flex-1 overflow-hidden px-6 py-6">

          {/* ── PROJECT panel ────────────────────────────────────────────────── */}
          {activePanel === 'project' && (
            <div className="flex flex-col gap-5 h-full overflow-y-auto">
              <Input
                label="Story Title"
                placeholder="The Shattered Realm…"
                value={setup.title}
                onChange={e => updateSetup({ title: e.target.value })}
              />

              {/* Synopsis (was "Setting") */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[#F8F6F0]/80">Synopsis</label>
                  <PolishButton text={setup.setting} context="setting" onApply={polished => updateSetup({ setting: polished })} />
                </div>
                <textarea
                  className="w-full px-3 py-2 rounded-lg bg-[#2D2D5E]/40 border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 resize-none focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 transition-colors text-sm"
                  placeholder="A crumbling empire at the edge of an interdimensional rift…"
                  rows={4}
                  value={setup.setting}
                  onChange={e => updateSetup({ setting: e.target.value })}
                />
                <p className="text-xs text-[#F8F6F0]/30 flex items-center gap-1">
                  <Wand2 className="w-3 h-3" /> Click the wand icon to polish with AI
                </p>
              </div>

              {/* Genre */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#F8F6F0]/80">Genre</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_GENRES.map(g => (
                    <button key={g} type="button"
                      onClick={() => { setIsCustomGenre(false); updateSetup({ genre: g }) }}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
                        !isCustomGenre && setup.genre === g
                          ? 'bg-[#F5A623] text-[#1A1A3E] border-[#F5A623] font-semibold'
                          : 'bg-[#1A1A3E] text-[#F8F6F0]/60 border-[#3D3D7A] hover:border-[#F5A623]/40 hover:text-[#F8F6F0]'
                      }`}
                    >{g}</button>
                  ))}
                  <button type="button" onClick={() => setIsCustomGenre(true)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
                      isCustomGenre ? 'bg-[#F5A623] text-[#1A1A3E] border-[#F5A623] font-semibold' : 'bg-[#1A1A3E] text-[#F8F6F0]/60 border-[#3D3D7A] hover:border-[#F5A623]/40 hover:text-[#F8F6F0]'
                    }`}
                  >Custom…</button>
                </div>
                {isCustomGenre && (
                  <input autoFocus
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#F5A623]/50 text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 text-sm"
                    placeholder="e.g. Solarpunk, Dieselpunk, Biopunk…"
                    value={customGenre}
                    onChange={e => setCustomGenre(e.target.value)}
                  />
                )}
              </div>

              {/* Tone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#F8F6F0]/80">Tone</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TONES.map(t => (
                    <button key={t} type="button"
                      onClick={() => { setIsCustomTone(false); updateSetup({ tone: t }) }}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
                        !isCustomTone && setup.tone === t
                          ? 'bg-[#F5A623] text-[#1A1A3E] border-[#F5A623] font-semibold'
                          : 'bg-[#1A1A3E] text-[#F8F6F0]/60 border-[#3D3D7A] hover:border-[#F5A623]/40 hover:text-[#F8F6F0]'
                      }`}
                    >{t}</button>
                  ))}
                  <button type="button" onClick={() => setIsCustomTone(true)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
                      isCustomTone ? 'bg-[#F5A623] text-[#1A1A3E] border-[#F5A623] font-semibold' : 'bg-[#1A1A3E] text-[#F8F6F0]/60 border-[#3D3D7A] hover:border-[#F5A623]/40 hover:text-[#F8F6F0]'
                    }`}
                  >Custom…</button>
                </div>
                {isCustomTone && (
                  <input autoFocus
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#F5A623]/50 text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 text-sm"
                    placeholder="e.g. Melancholic, Philosophical, Satirical…"
                    value={customTone}
                    onChange={e => setCustomTone(e.target.value)}
                  />
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button onClick={() => setActivePanel('characters')}>Next: Characters →</Button>
              </div>
            </div>
          )}

          {/* ── CHARACTERS panel (two-panel) ─────────────────────────────────── */}
          {activePanel === 'characters' && (
            <div className="h-full flex flex-col gap-4">
              <CharactersPanel setup={setup} updateSetup={updateSetup} />
              <div className="flex justify-between pt-2 border-t border-[#3D3D7A] shrink-0">
                <Button variant="ghost" onClick={() => setActivePanel('project')}>← Back</Button>
                <Button onClick={() => setActivePanel('guardrails')} disabled={setup.characters.length === 0}>
                  Next: Guardrails →
                </Button>
              </div>
            </div>
          )}

          {/* ── GUARDRAILS panel (two-panel) ──────────────────────────────────── */}
          {activePanel === 'guardrails' && (
            <div className="h-full flex flex-col gap-4">
              <GuardrailsPanel setup={setup} updateSetup={updateSetup} />
              {error && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-red-400 text-sm shrink-0">
                  {error}
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#3D3D7A] shrink-0">
                <Button variant="ghost" onClick={() => setActivePanel('characters')}>← Back</Button>
                <Button loading={loading} size="lg" onClick={handleLaunch}>
                  <Wand2 className="w-4 h-4" /> Launch Story
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
