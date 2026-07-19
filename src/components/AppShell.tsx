import { useState, useRef } from 'react'
import { useStory } from '@/contexts/StoryContext'
import { useAuth } from '@/contexts/AuthContext'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { DashboardTab } from '@/components/dashboard/DashboardTab'
import { StoriesTab } from '@/components/dashboard/StoriesTab'
import { SettingsTab } from '@/components/dashboard/SettingsTab'
import { SetupStep } from '@/components/setup/SetupStep'
import { PlayStep } from '@/components/play/PlayStep'
import { ReviewStep } from '@/components/review/ReviewStep'
import {
  BookOpen, LayoutDashboard, Library, Settings, LogOut,
  ChevronRight, PanelLeft, PanelLeftClose,
} from 'lucide-react'

type SidebarTab = 'dashboard' | 'stories' | 'settings'
/** expanded = always wide open  |  collapsed = icon-only  |  hover = expand on hover */
type SidebarMode = 'expanded' | 'collapsed' | 'hover'

const SIDEBAR_COLLAPSED_W = 64   // px — icon rail width
const SIDEBAR_EXPANDED_W  = 220  // px — label-visible width

// ── Step breadcrumb (shown while in story workflow) ───────────────────────────
function StepBreadcrumb({ step }: { step: string }) {
  const steps = [
    { id: 'setup',  label: 'Setup'  },
    { id: 'play',   label: 'Play'   },
    { id: 'review', label: 'Review' },
  ]
  const idx = steps.findIndex(s => s.id === step)
  if (idx === -1) return null
  return (
    <div className="flex items-center gap-1 text-xs text-[#F8F6F0]/40">
      {steps.map((s, i) => (
        <span key={s.id} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3" />}
          <span className={i === idx ? 'text-[#F5A623] font-semibold' : ''}>{s.label}</span>
        </span>
      ))}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
interface SidebarProps {
  mode: SidebarMode
  activeTab: SidebarTab
  onTabChange: (t: SidebarTab) => void
  onModeToggle: () => void
  signOut: () => void
  userEmail: string | undefined
  storyActive: boolean
  onStoryReset: () => void
}

function Sidebar({
  mode, activeTab, onTabChange, onModeToggle, signOut,
  userEmail, storyActive, onStoryReset,
}: SidebarProps) {
  const [hovered, setHovered] = useState(false)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // In hover mode the sidebar is wide when the mouse is over it
  const isOpen =
    mode === 'expanded' ||
    (mode === 'hover' && hovered)

  const navItems: { id: SidebarTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stories',   label: 'Stories',   icon: Library          },
    { id: 'settings',  label: 'Settings',  icon: Settings         },
  ]

  const modeNextLabel: Record<SidebarMode, string> = {
    expanded: 'Collapse sidebar',
    collapsed: 'Hover to expand',
    hover: 'Always expand',
  }

  const handleMouseEnter = () => {
    if (mode !== 'hover') return
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    setHovered(true)
  }
  const handleMouseLeave = () => {
    if (mode !== 'hover') return
    leaveTimer.current = setTimeout(() => setHovered(false), 150)
  }

  const w = isOpen ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: w,
        minWidth: w,
        transition: 'width 0.25s ease, min-width 0.25s ease',
      }}
      className="fixed top-0 left-0 h-screen z-[100] flex flex-col bg-[#12122A] border-r border-[#3D3D7A] overflow-hidden select-none"
    >
      {/* Logo row */}
      <div className="flex items-center gap-3 px-3 py-4 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-[#F5A623]" />
        </div>
        {isOpen && (
          <span
            className="font-bold text-[#F8F6F0] text-base whitespace-nowrap overflow-hidden"
            style={{ transition: 'opacity 0.2s ease', opacity: isOpen ? 1 : 0 }}
          >
            StoryForge
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id && !storyActive
          return (
            <button
              key={id}
              title={!isOpen ? label : undefined}
              onClick={() => { onTabChange(id); if (storyActive) onStoryReset() }}
              className={`group flex items-center gap-3 px-2.5 py-2.5 rounded-xl transition-colors cursor-pointer w-full ${
                active
                  ? 'bg-[#F5A623]/20 text-[#F5A623]'
                  : 'text-[#F8F6F0]/40 hover:text-[#F8F6F0]/80 hover:bg-[#2D2D5E]/60'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {isOpen && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden">
                  {label}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom area */}
      <div className="flex flex-col gap-1 px-2 pb-4 shrink-0">
        {/* User email when expanded */}
        {isOpen && userEmail && (
          <div className="px-2.5 py-1 text-[10px] text-[#F8F6F0]/25 truncate">{userEmail}</div>
        )}

        {/* Sign out */}
        <button
          title="Sign out"
          onClick={signOut}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[#F8F6F0]/30 hover:text-red-400/80 hover:bg-[#2D2D5E]/60 transition-colors cursor-pointer w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {isOpen && <span className="text-sm whitespace-nowrap">Sign out</span>}
        </button>

        {/* Mode toggle */}
        <button
          title={modeNextLabel[mode]}
          onClick={onModeToggle}
          className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-[#F8F6F0]/20 hover:text-[#F8F6F0]/60 hover:bg-[#2D2D5E]/40 transition-colors cursor-pointer w-full"
        >
          {mode === 'expanded'
            ? <PanelLeftClose className="w-4 h-4 shrink-0" />
            : <PanelLeft className="w-4 h-4 shrink-0" />
          }
          {isOpen && (
            <span className="text-xs whitespace-nowrap overflow-hidden">
              {modeNextLabel[mode]}
            </span>
          )}
        </button>
      </div>
    </aside>
  )
}

// ── AppShell ──────────────────────────────────────────────────────────────────
export function AppShell() {
  const { user, loading, signOut } = useAuth()
  const { state, dispatch } = useStory()
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('dashboard')
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('hover')

  const cycleSidebarMode = () => {
    setSidebarMode(m =>
      m === 'expanded' ? 'collapsed' : m === 'collapsed' ? 'hover' : 'expanded',
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A3E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#3D3D7A] border-t-[#F5A623] animate-spin" />
          <p className="text-[#F8F6F0]/50 text-sm">Loading StoryForge…</p>
        </div>
      </div>
    )
  }

  if (!user) return <AuthScreen />

  // Main content left-margin matches the collapsed icon rail (64px).
  // The sidebar may hover-expand visually, but it floats over content —
  // so the content offset is always the minimum collapsed width.
  const mainMargin = SIDEBAR_COLLAPSED_W

  return (
    <div className="bg-[#1A1A3E] min-h-screen">
      <Sidebar
        mode={sidebarMode}
        activeTab={sidebarTab}
        onTabChange={tab => { setSidebarTab(tab) }}
        onModeToggle={cycleSidebarMode}
        signOut={signOut}
        userEmail={user.email ?? undefined}
        storyActive={state.step !== 'dashboard'}
        onStoryReset={() => dispatch({ type: 'RESET' })}
      />

      {/* Main area — always offset by the fixed collapsed sidebar width */}
      <main
        style={{ marginLeft: mainMargin }}
        className="min-h-screen overflow-y-auto"
      >
        {state.step === 'play'    && <PlayStep />}
        {state.step === 'review'  && <ReviewStep />}

        {state.step === 'dashboard' && (
          <>
            {sidebarTab === 'dashboard' && <DashboardTab />}
            {sidebarTab === 'stories'   && <StoriesTab />}
            {sidebarTab === 'settings'  && <SettingsTab />}
          </>
        )}

        {/* Breadcrumb overlay while in story workflow */}
        {state.step !== 'dashboard' && (
          <div className="fixed top-3 right-4 z-40 flex items-center gap-3">
            <StepBreadcrumb step={state.step} />
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="text-xs text-[#F8F6F0]/30 hover:text-[#F8F6F0]/60 px-2 py-1 rounded-lg bg-[#2D2D5E]/60 border border-[#3D3D7A] transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </div>
        )}
      </main>

      {/* SetupStep modal overlay */}
      {state.step === 'setup' && <SetupStep />}
    </div>
  )
}
