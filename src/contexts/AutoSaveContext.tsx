import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface AutoSaveContextValue {
  status: SaveStatus
  setSaving: () => void
  setSaved: () => void
  setError: () => void
}

const AutoSaveContext = createContext<AutoSaveContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
export function AutoSaveProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setSaving = useCallback(() => {
    if (clearTimer.current) clearTimeout(clearTimer.current)
    setStatus('saving')
  }, [])

  const setSaved = useCallback(() => {
    setStatus('saved')
    clearTimer.current = setTimeout(() => setStatus('idle'), 3000)
  }, [])

  const setError = useCallback(() => {
    setStatus('error')
    clearTimer.current = setTimeout(() => setStatus('idle'), 5000)
  }, [])

  return (
    <AutoSaveContext.Provider value={{ status, setSaving, setSaved, setError }}>
      {children}
    </AutoSaveContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useAutoSave() {
  const ctx = useContext(AutoSaveContext)
  if (!ctx) throw new Error('useAutoSave must be used inside AutoSaveProvider')
  return ctx
}

// ── Indicator widget ──────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<SaveStatus, { icon: React.ElementType; label: string; cls: string } | null> = {
  idle:   null,
  saving: { icon: Loader2,      label: 'Saving…',       cls: 'text-[#F8F6F0]/40' },
  saved:  { icon: CheckCircle2, label: 'Saved',          cls: 'text-emerald-400' },
  error:  { icon: AlertCircle,  label: 'Error saving',   cls: 'text-red-400' },
}

export function AutoSaveIndicator({ className }: { className?: string }) {
  const { status } = useAutoSave()
  const config = STATUS_CONFIG[status]
  if (!config) return null

  const { icon: Icon, label, cls } = config
  return (
    <div className={cn('flex items-center gap-1.5 text-xs', cls, className)}>
      <Icon className={cn('w-3.5 h-3.5', status === 'saving' && 'animate-spin')} />
      <span>{label}</span>
    </div>
  )
}
