import {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
export type ToastVariant = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  message: string
  duration?: number  // ms; 0 = sticky
}

type Action =
  | { type: 'ADD'; payload: Toast }
  | { type: 'REMOVE'; id: string }

// ── Reducer ───────────────────────────────────────────────────────────────────
function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'ADD':
      // cap at 5 toasts
      return [...state.slice(-4), action.payload]
    case 'REMOVE':
      return state.filter(t => t.id !== action.id)
    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
interface ToastContextValue {
  toasts: Toast[]
  toast: (message: string, variant?: ToastVariant, duration?: number) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// ── Individual toast item ─────────────────────────────────────────────────────
const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-emerald-500/40 bg-[#1A1A3E] shadow-emerald-900/20',
  error:   'border-red-500/40   bg-[#1A1A3E] shadow-red-900/20',
  info:    'border-[#F5A623]/40  bg-[#1A1A3E] shadow-indigo-900/20',
}

const VARIANT_ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  error:   XCircle,
  info:    Info,
}

const ICON_COLORS: Record<ToastVariant, string> = {
  success: 'text-emerald-400',
  error:   'text-red-400',
  info:    'text-[#F5A623]',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = VARIANT_ICONS[toast.variant]
  const duration = toast.duration ?? (toast.variant === 'error' ? 7000 : 4000)

  useEffect(() => {
    if (duration === 0) return
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [duration, onDismiss])

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl',
        'min-w-[280px] max-w-[360px] animate-in slide-in-from-right-4 fade-in duration-200',
        VARIANT_STYLES[toast.variant],
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', ICON_COLORS[toast.variant])} />
      <p className="flex-1 text-sm text-[#F8F6F0]/90 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-[#F8F6F0]/30 hover:text-[#F8F6F0]/70 transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])

  const toast = useCallback((message: string, variant: ToastVariant = 'info', duration?: number) => {
    dispatch({
      type: 'ADD',
      payload: { id: crypto.randomUUID(), message, variant, duration },
    })
  }, [])

  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id })
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}

      {/* Toast container — bottom-right */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end">
        {toasts.map(t => (
          <ToastItem
            key={t.id}
            toast={t}
            onDismiss={() => dismiss(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
