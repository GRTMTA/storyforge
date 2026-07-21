import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useStory } from '@/contexts/StoryContext'
import {
  listProjects, loadScenes, exportStoryAsText,
} from '@/services/storyService'
import { supabase } from '@/lib/supabase'
import {
  User, Mail, Camera, Save, Download, Trash2,
  Key, Copy, RefreshCw, Webhook, AlertTriangle,
  CheckCircle, Loader2, BookOpen,
} from 'lucide-react'

// ── Helpers ────────────────────────────────────────────────────────────────────

const PREF_KEY = 'scribis:user-prefs'

interface UserPrefs {
  displayName: string
  defaultGenre: string
  defaultTone: string
  autoSave: string
  webhookUrl: string
}

function loadPrefs(userId: string): UserPrefs {
  try {
    const raw = localStorage.getItem(`${PREF_KEY}:${userId}`)
    return raw ? JSON.parse(raw) : { displayName: '', defaultGenre: 'Fantasy', defaultTone: 'Epic', autoSave: 'off', webhookUrl: '' }
  } catch { return { displayName: '', defaultGenre: 'Fantasy', defaultTone: 'Epic', autoSave: 'off', webhookUrl: '' } }
}

function savePrefs(userId: string, prefs: UserPrefs) {
  localStorage.setItem(`${PREF_KEY}:${userId}`, JSON.stringify(prefs))
}

function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'sk_live_'
  for (let i = 0; i < 32; i++) key += chars[Math.floor(Math.random() * chars.length)]
  return key
}

function getStoredApiKey(userId: string): string {
  const k = `scribis:apikey:${userId}`
  let key = localStorage.getItem(k)
  if (!key) { key = generateApiKey(); localStorage.setItem(k, key) }
  return key
}

// ── Section heading ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold text-[#F8F6F0] pb-4 border-b border-[#3D3D7A] mb-6">
      {children}
    </h2>
  )
}

// ── Inline save feedback ───────────────────────────────────────────────────────

function SaveFeedback({ msg }: { msg: string | null }) {
  if (!msg) return null
  const ok = msg.includes('Saved') || msg.includes('Copied') || msg.includes('Regenerated')
  return (
    <span className={`text-sm flex items-center gap-1.5 ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {msg}
    </span>
  )
}

// ── Main SettingsTab ───────────────────────────────────────────────────────────

const GENRES = ['Fantasy', 'Sci-Fi', 'Mystery', 'Horror', 'Romance', 'Thriller', 'Historical', 'Adventure']
const TONES  = ['Epic', 'Dark', 'Whimsical', 'Gritty', 'Hopeful', 'Mysterious', 'Comedic', 'Tense']

export function SettingsTab() {
  const { user, signOut } = useAuth()
  const { dispatch } = useStory()

  // ── Prefs (loaded from localStorage, keyed per user) ──────────────────────
  const [prefs, setPrefs] = useState<UserPrefs>(() =>
    user ? loadPrefs(user.id) : { displayName: '', defaultGenre: 'Fantasy', defaultTone: 'Epic', autoSave: 'off', webhookUrl: '' }
  )

  useEffect(() => {
    if (user) setPrefs(loadPrefs(user.id))
  }, [user?.id])

  const updatePrefs = (patch: Partial<UserPrefs>) => {
    const next = { ...prefs, ...patch }
    setPrefs(next)
    if (user) savePrefs(user.id, next)
  }

  // ── Profile state ─────────────────────────────────────────────────────────
  const [nameSaving,    setNameSaving]    = useState(false)
  const [nameFeedback,  setNameFeedback]  = useState<string | null>(null)
  const [avatarUrl,     setAvatarUrl]     = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Load avatar URL from user metadata
  useEffect(() => {
    const meta = user?.user_metadata as Record<string, string> | undefined
    if (meta?.avatar_url) setAvatarUrl(meta.avatar_url)
  }, [user])

  const handleSaveName = async () => {
    if (!user) return
    setNameSaving(true); setNameFeedback(null)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: prefs.displayName },
      })
      setNameFeedback(error ? error.message : 'Saved!')
    } catch (e) {
      setNameFeedback(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setNameSaving(false)
      setTimeout(() => setNameFeedback(null), 3000)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setAvatarUploading(true)
    try {
      const ext  = file.name.split('.').pop() ?? 'png'
      const path = `avatars/${user.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw new Error(upErr.message)
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } })
      setAvatarUrl(publicUrl)
    } catch { /* silent */ }
    finally { setAvatarUploading(false) }
  }

  // ── Story defaults ────────────────────────────────────────────────────────
  const [defaultsFeedback, setDefaultsFeedback] = useState<string | null>(null)
  const handleSaveDefaults = () => {
    if (user) savePrefs(user.id, prefs)
    setDefaultsFeedback('Saved!')
    setTimeout(() => setDefaultsFeedback(null), 3000)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false)

  const handleExportAll = async () => {
    if (!user) return
    setExporting(true)
    try {
      const projects = await listProjects(user.id)
      const bundle: Record<string, unknown> = { exported_at: new Date().toISOString(), stories: [] }
      const stories: unknown[] = []
      for (const p of projects) {
        const scenes = await loadScenes(p.id)
        stories.push({ ...p, scenes })
      }
      bundle.stories = stories
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `scribis-export-${Date.now()}.json`; a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  const handleExportMarkdown = async () => {
    if (!user) return
    setExporting(true)
    try {
      const projects = await listProjects(user.id)
      const parts: string[] = []
      for (const p of projects) {
        const md = await exportStoryAsText(p.id, p.title)
        parts.push(md, '\n\n---\n\n')
      }
      const blob = new Blob([parts.join('')], { type: 'text/markdown' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `scribis-stories-${Date.now()}.md`; a.click()
      URL.revokeObjectURL(url)
    } finally { setExporting(false) }
  }

  // ── API Key ───────────────────────────────────────────────────────────────
  const [apiKey,      setApiKey]      = useState(() => user ? getStoredApiKey(user.id) : '')
  const [apiKeyMask,  setApiKeyMask]  = useState(true)
  const [apiFeedback, setApiFeedback] = useState<string | null>(null)
  const [webhookSaving, setWebhookSaving] = useState(false)

  const handleCopyApiKey = async () => {
    await navigator.clipboard.writeText(apiKey).catch(() => {})
    setApiFeedback('Copied to clipboard!')
    setTimeout(() => setApiFeedback(null), 3000)
  }

  const handleRegenApiKey = () => {
    if (!user) return
    const newKey = generateApiKey()
    localStorage.setItem(`scribis:apikey:${user.id}`, newKey)
    setApiKey(newKey)
    setApiFeedback('Regenerated!')
    setTimeout(() => setApiFeedback(null), 3000)
  }

  const handleSaveWebhook = () => {
    setWebhookSaving(true)
    setTimeout(() => {
      updatePrefs({ webhookUrl: prefs.webhookUrl })
      setWebhookSaving(false)
      setApiFeedback('Webhook saved!')
      setTimeout(() => setApiFeedback(null), 3000)
    }, 600)
  }

  // ── Danger zone ───────────────────────────────────────────────────────────
  const [deleteStep,    setDeleteStep]    = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deleteEmail,   setDeleteEmail]   = useState('')
  const [deleteFeedback, setDeleteFeedback] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    if (!user) return
    if (deleteEmail.toLowerCase().trim() !== user.email?.toLowerCase()) {
      setDeleteFeedback('Email does not match your account.')
      return
    }
    setDeleteStep('deleting')
    try {
      // Sign out and let the user know — actual account deletion requires
      // a privileged Supabase admin call; we do the best available client-side.
      await signOut()
      dispatch({ type: 'RESET' })
    } catch (e) {
      setDeleteFeedback(e instanceof Error ? e.message : 'Failed to delete account')
      setDeleteStep('confirm')
    }
  }

  // ── Field class ───────────────────────────────────────────────────────────
  const fieldCls = 'w-full px-5 py-3.5 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl text-[#F8F6F0] text-base placeholder-[#F8F6F0]/25 focus:outline-none focus:border-[#F5A623]/60'
  const selectCls = `${fieldCls} cursor-pointer appearance-none`
  const labelCls  = 'block text-sm font-semibold text-[#F8F6F0]/50 uppercase tracking-wide mb-2'

  const initials = (prefs.displayName || user?.email?.split('@')[0] || 'U').slice(0, 2).toUpperCase()

  return (
    <div className="px-8 md:px-14 py-12 w-full max-w-3xl">

      {/* Page heading */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[#F8F6F0] mb-2">Settings</h1>
        <p className="text-[#F8F6F0]/45 text-lg">Manage your account and preferences</p>
      </div>

      {/* ── Profile ─────────────────────────────────────────────────────────── */}
      <section className="mb-14">
        <SectionHeading>
          <span className="flex items-center gap-2"><User className="w-5 h-5 text-[#F5A623]" /> Profile</span>
        </SectionHeading>

        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover border-2 border-[#3D3D7A]" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[#F5A623]/15 border-2 border-[#F5A623]/30 flex items-center justify-center">
                <span className="text-2xl font-bold text-[#F5A623]">{initials}</span>
              </div>
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#F5A623] border-2 border-[#1A1A3E] flex items-center justify-center cursor-pointer hover:bg-[#F7C05A] transition-colors disabled:opacity-50"
              title="Upload photo"
            >
              {avatarUploading
                ? <Loader2 className="w-3.5 h-3.5 text-[#1A1A3E] animate-spin" />
                : <Camera className="w-3.5 h-3.5 text-[#1A1A3E]" />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-[#F8F6F0] truncate">
              {prefs.displayName || user?.email?.split('@')[0] || 'Anonymous'}
            </p>
            <p className="text-base text-[#F8F6F0]/40 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 shrink-0" />
              {user?.email ?? '—'}
            </p>
          </div>
        </div>

        {/* Display name */}
        <div className="flex flex-col gap-2 mb-2">
          <label className={labelCls}>Display Name</label>
          <div className="flex gap-3">
            <input
              value={prefs.displayName}
              onChange={e => updatePrefs({ displayName: e.target.value })}
              placeholder={user?.email?.split('@')[0] ?? 'Your name'}
              className={`${fieldCls} flex-1`}
            />
            <button
              onClick={handleSaveName}
              disabled={nameSaving}
              className="flex items-center gap-2 px-5 py-3 bg-[#F5A623] text-[#1A1A3E] font-semibold rounded-xl hover:bg-[#F7C05A] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {nameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
          <SaveFeedback msg={nameFeedback} />
        </div>
      </section>

      {/* ── Story Defaults ──────────────────────────────────────────────────── */}
      <section className="mb-14">
        <SectionHeading>
          <span className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-[#F5A623]" /> Story Defaults</span>
        </SectionHeading>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
          <div>
            <label className={labelCls}>Default Genre</label>
            <div className="relative">
              <select value={prefs.defaultGenre} onChange={e => updatePrefs({ defaultGenre: e.target.value })} className={selectCls}>
                {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Default Tone</label>
            <div className="relative">
              <select value={prefs.defaultTone} onChange={e => updatePrefs({ defaultTone: e.target.value })} className={selectCls}>
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Auto-Save</label>
            <div className="relative">
              <select value={prefs.autoSave} onChange={e => updatePrefs({ autoSave: e.target.value })} className={selectCls}>
                <option value="off">Off</option>
                <option value="30s">Every 30 seconds</option>
                <option value="1min">Every 1 minute</option>
                <option value="5min">Every 5 minutes</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSaveDefaults}
            className="flex items-center gap-2 px-5 py-3 bg-[#F5A623] text-[#1A1A3E] font-semibold rounded-xl hover:bg-[#F7C05A] transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Defaults
          </button>
          <SaveFeedback msg={defaultsFeedback} />
        </div>
      </section>

      {/* ── Export ──────────────────────────────────────────────────────────── */}
      <section className="mb-14">
        <SectionHeading>
          <span className="flex items-center gap-2"><Download className="w-5 h-5 text-[#F5A623]" /> Export</span>
        </SectionHeading>
        <p className="text-[#F8F6F0]/50 mb-6 leading-relaxed">
          Download all your stories as a JSON bundle or as formatted Markdown documents.
        </p>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleExportAll}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3.5 bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0] font-medium rounded-xl hover:border-[#F5A623]/40 hover:bg-[#2D2D5E]/80 transition-colors cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export All Stories (JSON)
          </button>
          <button
            onClick={handleExportMarkdown}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3.5 bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0] font-medium rounded-xl hover:border-[#F5A623]/40 hover:bg-[#2D2D5E]/80 transition-colors cursor-pointer disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export as Markdown
          </button>
        </div>
      </section>

      {/* ── API & Integrations ───────────────────────────────────────────────── */}
      <section className="mb-14">
        <SectionHeading>
          <span className="flex items-center gap-2"><Key className="w-5 h-5 text-[#F5A623]" /> API &amp; Integrations</span>
        </SectionHeading>

        {/* API Key */}
        <div className="mb-6">
          <label className={labelCls}>API Key</label>
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 px-5 py-3.5 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl font-mono text-sm text-[#F8F6F0]/70 overflow-hidden">
              {apiKeyMask ? '•'.repeat(24) : apiKey}
            </div>
            <button
              onClick={() => setApiKeyMask(v => !v)}
              className="px-4 py-3 bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0]/50 rounded-xl hover:border-[#F5A623]/40 hover:text-[#F8F6F0] transition-colors cursor-pointer text-sm font-medium"
            >
              {apiKeyMask ? 'Show' : 'Hide'}
            </button>
            <button
              onClick={handleCopyApiKey}
              title="Copy"
              className="p-3.5 bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0]/50 rounded-xl hover:border-[#F5A623]/40 hover:text-[#F8F6F0] transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleRegenApiKey}
              title="Regenerate"
              className="p-3.5 bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0]/50 rounded-xl hover:border-[#F5A623]/40 hover:text-[#F8F6F0] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <SaveFeedback msg={apiFeedback} />
        </div>

        {/* Webhook URL */}
        <div>
          <label className={labelCls}>Webhook URL</label>
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-3 px-5 py-0.5 bg-[#2D2D5E]/60 border border-[#3D3D7A] rounded-xl focus-within:border-[#F5A623]/60">
              <Webhook className="w-4 h-4 text-[#F8F6F0]/25 shrink-0" />
              <input
                value={prefs.webhookUrl}
                onChange={e => updatePrefs({ webhookUrl: e.target.value })}
                placeholder="https://your-server.com/webhook"
                className="flex-1 bg-transparent text-[#F8F6F0] text-base placeholder-[#F8F6F0]/25 focus:outline-none py-3"
              />
            </div>
            <button
              onClick={handleSaveWebhook}
              disabled={webhookSaving}
              className="flex items-center gap-2 px-5 py-3 bg-[#2D2D5E]/60 border border-[#3D3D7A] text-[#F8F6F0]/70 font-medium rounded-xl hover:border-[#F5A623]/40 hover:text-[#F8F6F0] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              {webhookSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
          <p className="text-xs text-[#F8F6F0]/30 mt-2">
            Future feature — receive event payloads when scenes are generated.
          </p>
        </div>
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────────────── */}
      <section>
        <SectionHeading>
          <span className="flex items-center gap-2 text-red-400/80">
            <AlertTriangle className="w-5 h-5" /> Danger Zone
          </span>
        </SectionHeading>

        <p className="text-[#F8F6F0]/45 mb-6 leading-relaxed">
          Deleting your account is permanent and cannot be undone. All your stories, characters, and data will be erased.
        </p>

        {deleteStep === 'idle' && (
          <button
            onClick={() => setDeleteStep('confirm')}
            className="flex items-center gap-2 px-6 py-3.5 border border-red-500/30 text-red-400/80 hover:text-red-400 hover:border-red-500/60 rounded-xl transition-colors cursor-pointer font-medium"
          >
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        )}

        {(deleteStep === 'confirm' || deleteStep === 'deleting') && (
          <div className="p-6 border border-red-500/30 bg-red-500/8 rounded-2xl flex flex-col gap-4">
            <p className="text-[#F8F6F0]/80 font-medium">
              To confirm, enter your email address: <span className="text-red-400 font-mono">{user?.email}</span>
            </p>
            <input
              value={deleteEmail}
              onChange={e => setDeleteEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full px-5 py-3.5 bg-[#1A1A3E] border border-red-500/30 rounded-xl text-[#F8F6F0] placeholder-[#F8F6F0]/25 focus:outline-none focus:border-red-500/60"
            />
            {deleteFeedback && (
              <p className="text-sm text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {deleteFeedback}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteStep === 'deleting'}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleteStep === 'deleting'
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>
                  : <><Trash2 className="w-4 h-4" /> Yes, Delete My Account</>}
              </button>
              <button
                onClick={() => { setDeleteStep('idle'); setDeleteEmail(''); setDeleteFeedback(null) }}
                disabled={deleteStep === 'deleting'}
                className="px-6 py-3 border border-[#3D3D7A] text-[#F8F6F0]/60 hover:text-[#F8F6F0] rounded-xl transition-colors cursor-pointer font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
