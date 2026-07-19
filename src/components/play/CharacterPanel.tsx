/**
 * CharacterPanel — Story Full View character management
 * Features:
 *   - List all characters for a project (loaded from DB)
 *   - Delete / update characters
 *   - Click to open biography modal with custom fields
 *   - Relationship linking between characters
 *   - Relationship Web View (SVG graph) + Log View (timeline list)
 */
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Users, X, Plus, Trash2, Pencil, Check,
  Link2, Network, List, Save,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DBCharacter {
  id: string
  name: string
  role: 'protagonist' | 'antagonist' | 'supporting'
  description: string
  traits: string[]
  custom_fields?: Record<string, string>
  relations?: Relation[]
}

interface Relation {
  targetId: string
  label: string
}

interface CustomField {
  key: string
  value: string
}

// ── DB helpers ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any

async function fetchCharacters(projectId: string): Promise<DBCharacter[]> {
  const { data, error } = await db()
    .from('characters')
    .select('id, name, role, description, traits, custom_fields, relations')
    .eq('project_id', projectId)
    .order('role', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as DBCharacter[]
}

async function updateCharacter(id: string, patch: Partial<DBCharacter>): Promise<void> {
  const { error } = await db().from('characters').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

async function deleteCharacter(id: string): Promise<void> {
  const { error } = await db().from('characters').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Relationship Web View (SVG force-like layout) ─────────────────────────────

function RelationshipWeb({ characters }: { characters: DBCharacter[] }) {
  const SIZE = 320
  const cx = SIZE / 2
  const cy = SIZE / 2
  const r  = 110

  // Place characters in a circle
  const positions = characters.map((c, i) => {
    const angle = (2 * Math.PI * i) / characters.length - Math.PI / 2
    return {
      id: c.id,
      name: c.name,
      role: c.role,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  })
  const posMap = Object.fromEntries(positions.map(p => [p.id, p]))

  // Collect edges
  const edges: { from: string; to: string; label: string; key: string }[] = []
  for (const c of characters) {
    for (const rel of c.relations ?? []) {
      if (posMap[rel.targetId]) {
        edges.push({ from: c.id, to: rel.targetId, label: rel.label, key: `${c.id}-${rel.targetId}` })
      }
    }
  }

  const roleColor = (role: string) =>
    role === 'protagonist' ? '#F5A623' : role === 'antagonist' ? '#f87171' : '#94a3b8'

  if (characters.length === 0) {
    return <p className="text-sm text-[#F8F6F0]/25 text-center py-8">No characters to display.</p>
  }

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-xs mx-auto">
      {/* Edges */}
      {edges.map(e => {
        const f = posMap[e.from]
        const t = posMap[e.to]
        if (!f || !t) return null
        const mx = (f.x + t.x) / 2
        const my = (f.y + t.y) / 2
        return (
          <g key={e.key}>
            <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#3D3D7A" strokeWidth={1.5} />
            <text x={mx} y={my - 4} textAnchor="middle" fontSize={8} fill="#F8F6F0" fillOpacity={0.4}>
              {e.label}
            </text>
          </g>
        )
      })}
      {/* Nodes */}
      {positions.map(p => (
        <g key={p.id}>
          <circle cx={p.x} cy={p.y} r={18} fill={`${roleColor(p.role)}22`} stroke={roleColor(p.role)} strokeWidth={1.5} />
          <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={9} fontWeight="bold" fill={roleColor(p.role)}>
            {p.name.charAt(0).toUpperCase()}
          </text>
          <text x={p.x} y={p.y + 26} textAnchor="middle" fontSize={8} fill="#F8F6F0" fillOpacity={0.6}>
            {p.name.length > 10 ? p.name.slice(0, 10) + '…' : p.name}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Relationship Log View (timeline list) ─────────────────────────────────────

function RelationshipLog({ characters }: { characters: DBCharacter[] }) {
  const nameMap = Object.fromEntries(characters.map(c => [c.id, c.name]))

  const allRelations = characters.flatMap(c =>
    (c.relations ?? []).map(r => ({
      fromName: c.name,
      toName: nameMap[r.targetId] ?? r.targetId,
      label: r.label,
    }))
  )

  if (allRelations.length === 0) {
    return <p className="text-sm text-[#F8F6F0]/25 text-center py-6">No relationships defined.</p>
  }

  return (
    <div className="flex flex-col gap-2">
      {allRelations.map((rel, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-xl">
          <div className="w-2 h-2 rounded-full bg-[#F5A623]/60 shrink-0" />
          <span className="text-sm text-[#F8F6F0]/80 font-medium">{rel.fromName}</span>
          <span className="text-xs text-[#F5A623]/70 italic">→ {rel.label} →</span>
          <span className="text-sm text-[#F8F6F0]/80 font-medium">{rel.toName}</span>
        </div>
      ))}
    </div>
  )
}

// ── Biography Modal ───────────────────────────────────────────────────────────

interface BioModalProps {
  char: DBCharacter
  allChars: DBCharacter[]
  onSave: (updated: DBCharacter) => void
  onDelete: () => void
  onClose: () => void
}

function BiographyModal({ char, allChars, onSave, onDelete, onClose }: BioModalProps) {
  const [draft, setDraft] = useState<DBCharacter>({ ...char, custom_fields: { ...(char.custom_fields ?? {}) }, relations: [...(char.relations ?? [])] })
  const [saving, setSaving] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const [relTarget, setRelTarget] = useState('')
  const [relLabel, setRelLabel] = useState('')
  const [relView, setRelView] = useState<'web' | 'log'>('web')

  const otherChars = allChars.filter(c => c.id !== char.id)

  const updateField = (key: string, value: string) => {
    setDraft(d => ({ ...d, custom_fields: { ...(d.custom_fields ?? {}), [key]: value } }))
  }

  const removeField = (key: string) => {
    setDraft(d => {
      const next = { ...(d.custom_fields ?? {}) }
      delete next[key]
      return { ...d, custom_fields: next }
    })
  }

  const addField = () => {
    if (!newKey.trim()) return
    updateField(newKey.trim(), newVal.trim())
    setNewKey('')
    setNewVal('')
  }

  const addRelation = () => {
    if (!relTarget || !relLabel.trim()) return
    setDraft(d => ({
      ...d,
      relations: [...(d.relations ?? []), { targetId: relTarget, label: relLabel.trim() }],
    }))
    setRelLabel('')
    setRelTarget('')
  }

  const removeRelation = (idx: number) => {
    setDraft(d => ({ ...d, relations: (d.relations ?? []).filter((_, i) => i !== idx) }))
  }

  const handleSave = async () => {
    setSaving(true)
    try { await updateCharacter(draft.id, { name: draft.name, description: draft.description, traits: draft.traits, custom_fields: draft.custom_fields, relations: draft.relations }) }
    catch { /* ignore */ }
    finally {
      setSaving(false)
      onSave(draft)
    }
  }

  const roleColor = char.role === 'protagonist' ? '#F5A623' : char.role === 'antagonist' ? '#f87171' : '#94a3b8'

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-[75vw] h-[80vh] min-w-[600px] min-h-[480px] bg-[#1A1A3E] border border-[#3D3D7A] rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3D3D7A] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold" style={{ backgroundColor: `${roleColor}22`, border: `1.5px solid ${roleColor}` }}>
              <span style={{ color: roleColor }}>{char.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <input
                className="font-bold text-[#F8F6F0] text-lg bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-[#F5A623]/40 rounded px-1"
                value={draft.name}
                onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              />
              <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'} className="text-[10px] ml-2">
                {char.role}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="danger" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-[#F8F6F0]/40 hover:text-[#F8F6F0] hover:bg-[#2D2D5E] transition-colors cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body — two columns */}
        <div className="flex-1 overflow-hidden flex">

          {/* Left — biography */}
          <div className="w-[55%] border-r border-[#3D3D7A] px-6 py-5 overflow-y-auto flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide">Description</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[#2D2D5E]/40 border border-[#3D3D7A] text-[#F8F6F0]/80 placeholder:text-[#F8F6F0]/30 resize-none focus:outline-none focus:ring-2 focus:ring-[#F5A623]/40 text-sm"
                value={draft.description}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              />
            </div>

            {/* Traits */}
            <div>
              <label className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-2 block">Traits</label>
              <div className="flex flex-wrap gap-1.5">
                {draft.traits.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30">
                    {t}
                    <button onClick={() => setDraft(d => ({ ...d, traits: d.traits.filter(x => x !== t) }))} className="text-[#F5A623]/50 hover:text-red-400 cursor-pointer">×</button>
                  </span>
                ))}
                <TraitAdder onAdd={t => { if (!draft.traits.includes(t)) setDraft(d => ({ ...d, traits: [...d.traits, t] })) }} />
              </div>
            </div>

            {/* Custom fields */}
            <div>
              <label className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide mb-2 block">Custom Fields</label>
              <div className="flex flex-col gap-2 mb-3">
                {Object.entries(draft.custom_fields ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="text-xs text-[#F5A623]/80 font-medium w-28 shrink-0 truncate">{k}</span>
                    <input
                      className="flex-1 px-2 py-1.5 rounded-lg bg-[#2D2D5E]/40 border border-[#3D3D7A] text-xs text-[#F8F6F0]/80 focus:outline-none focus:ring-1 focus:ring-[#F5A623]/40"
                      value={v}
                      onChange={e => updateField(k, e.target.value)}
                    />
                    <button onClick={() => removeField(k)} className="text-[#F8F6F0]/25 hover:text-red-400 cursor-pointer shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {/* Add new field */}
              <div className="flex gap-2">
                <input
                  className="w-28 shrink-0 px-2 py-1.5 rounded-lg bg-[#2D2D5E]/40 border border-[#3D3D7A] text-xs text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-1 focus:ring-[#F5A623]/40"
                  placeholder="Field name"
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addField()}
                />
                <input
                  className="flex-1 px-2 py-1.5 rounded-lg bg-[#2D2D5E]/40 border border-[#3D3D7A] text-xs text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-1 focus:ring-[#F5A623]/40"
                  placeholder="Value"
                  value={newVal}
                  onChange={e => setNewVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addField()}
                />
                <button onClick={addField} className="px-2 py-1.5 bg-[#F5A623]/15 text-[#F5A623] rounded-lg border border-[#F5A623]/30 hover:bg-[#F5A623]/25 cursor-pointer transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right — relationships */}
          <div className="flex-1 px-6 py-5 overflow-y-auto flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#F8F6F0]/40 uppercase tracking-wide flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" /> Relationships
              </label>
              {/* View toggle */}
              <div className="flex gap-1">
                <button
                  onClick={() => setRelView('web')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${relView === 'web' ? 'bg-[#F5A623]/20 text-[#F5A623]' : 'text-[#F8F6F0]/30 hover:text-[#F8F6F0]/60'}`}
                >
                  <Network className="w-3 h-3" /> Web
                </button>
                <button
                  onClick={() => setRelView('log')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${relView === 'log' ? 'bg-[#F5A623]/20 text-[#F5A623]' : 'text-[#F8F6F0]/30 hover:text-[#F8F6F0]/60'}`}
                >
                  <List className="w-3 h-3" /> Log
                </button>
              </div>
            </div>

            {/* Relationship view */}
            <div className="flex-1 min-h-[100px]">
              {relView === 'web'
                ? <RelationshipWeb characters={allChars} />
                : <RelationshipLog characters={allChars} />}
            </div>

            {/* Add relation for this character */}
            {otherChars.length > 0 && (
              <div className="border-t border-[#3D3D7A] pt-4">
                <p className="text-xs text-[#F8F6F0]/40 font-medium mb-2">Link {draft.name} to another character</p>
                <div className="flex gap-2 items-center">
                  <select
                    className="flex-1 px-2 py-1.5 rounded-lg bg-[#2D2D5E]/40 border border-[#3D3D7A] text-sm text-[#F8F6F0] focus:outline-none focus:ring-1 focus:ring-[#F5A623]/40"
                    value={relTarget}
                    onChange={e => setRelTarget(e.target.value)}
                  >
                    <option value="">— Select character —</option>
                    {otherChars.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <input
                    className="flex-1 px-2 py-1.5 rounded-lg bg-[#2D2D5E]/40 border border-[#3D3D7A] text-sm text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-1 focus:ring-[#F5A623]/40"
                    placeholder="Relation label (e.g. mentor)"
                    value={relLabel}
                    onChange={e => setRelLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addRelation()}
                  />
                  <button onClick={addRelation} className="px-2 py-1.5 bg-[#F5A623]/15 text-[#F5A623] rounded-lg border border-[#F5A623]/30 hover:bg-[#F5A623]/25 cursor-pointer transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Current relations list */}
                <div className="flex flex-col gap-1.5 mt-3">
                  {(draft.relations ?? []).map((r, i) => {
                    const target = allChars.find(c => c.id === r.targetId)
                    return (
                      <div key={i} className="flex items-center gap-2 p-2 bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-lg">
                        <Link2 className="w-3 h-3 text-[#F5A623]/50 shrink-0" />
                        <span className="text-xs text-[#F8F6F0]/60 flex-1">
                          <span className="text-[#F5A623]/80 italic">{r.label}</span> → {target?.name ?? r.targetId}
                        </span>
                        <button onClick={() => removeRelation(i)} className="text-[#F8F6F0]/25 hover:text-red-400 cursor-pointer shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Tiny inline trait adder
function TraitAdder({ onAdd }: { onAdd: (t: string) => void }) {
  const [val, setVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        className="w-20 px-2 py-0.5 rounded-full text-xs bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 focus:outline-none focus:ring-1 focus:ring-[#F5A623]/40"
        placeholder="+ trait"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            onAdd(val.trim())
            setVal('')
          }
        }}
      />
    </div>
  )
}

// ── CharacterPanel ────────────────────────────────────────────────────────────

interface CharacterPanelProps {
  projectId: string
  onClose: () => void
}

export function CharacterPanel({ projectId, onClose }: CharacterPanelProps) {
  const [characters, setCharacters] = useState<DBCharacter[]>([])
  const [loading, setLoading]       = useState(true)
  const [selected, setSelected]     = useState<DBCharacter | null>(null)

  useEffect(() => {
    fetchCharacters(projectId)
      .then(setCharacters)
      .catch(() => setCharacters([]))
      .finally(() => setLoading(false))
  }, [projectId])

  const handleSave = (updated: DBCharacter) => {
    setCharacters(cs => cs.map(c => c.id === updated.id ? updated : c))
    setSelected(null)
  }

  const handleDelete = async (id: string) => {
    try { await deleteCharacter(id) }
    catch { /* ignore */ }
    setCharacters(cs => cs.filter(c => c.id !== id))
    setSelected(null)
  }

  const roleColor = (role: string) =>
    role === 'protagonist' ? '#F5A623' : role === 'antagonist' ? '#f87171' : '#94a3b8'

  return (
    <>
      {/* Panel */}
      <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3D3D7A]">
          <p className="text-sm font-semibold text-[#F8F6F0]/80 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#F5A623]" /> Characters
          </p>
          <button onClick={onClose} className="text-[#F8F6F0]/30 hover:text-[#F8F6F0] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 rounded-full border-2 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
            </div>
          ) : characters.length === 0 ? (
            <p className="text-sm text-[#F8F6F0]/25 text-center py-4">No characters found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {characters.map(char => (
                <div
                  key={char.id}
                  onClick={() => setSelected(char)}
                  className="flex items-center gap-3 p-3 bg-[#1A1A3E]/50 border border-[#3D3D7A] rounded-xl cursor-pointer hover:border-[#F5A623]/40 hover:bg-[#2D2D5E]/50 transition-colors group"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ backgroundColor: `${roleColor(char.role)}22`, border: `1.5px solid ${roleColor(char.role)}` }}
                  >
                    <span style={{ color: roleColor(char.role) }}>{char.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#F8F6F0] truncate group-hover:text-[#F5A623] transition-colors">{char.name}</p>
                    <p className="text-xs text-[#F8F6F0]/40 truncate">{char.description || '—'}</p>
                  </div>
                  <Badge variant={char.role === 'protagonist' ? 'gold' : char.role === 'antagonist' ? 'danger' : 'default'} className="text-[10px] shrink-0">
                    {char.role}
                  </Badge>
                  <Pencil className="w-3.5 h-3.5 text-[#F8F6F0]/20 group-hover:text-[#F5A623]/60 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Biography modal */}
      {selected && (
        <BiographyModal
          char={selected}
          allChars={characters}
          onSave={handleSave}
          onDelete={() => handleDelete(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
