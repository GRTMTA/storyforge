import { useState } from 'react'
import { useStory } from '@/contexts/StoryContext'
import { useAuth } from '@/contexts/AuthContext'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { DashboardTab } from '@/components/dashboard/DashboardTab'
import { StoriesTab } from '@/components/dashboard/StoriesTab'
import { SettingsTab } from '@/components/dashboard/SettingsTab'
import { SetupStep } from '@/components/setup/SetupStep'
import { PlayStep } from '@/components/play/PlayStep'
import { ReviewStep } from '@/components/review/ReviewStep'
import { BookOpen, LayoutDashboard, Library, Settings, LogOut, ChevronRight } from 'lucide-react'

type SidebarTab = 'dashboard' | 'stories' | 'settings'

// ── Step indicator used when a story workflow is active ───────────────────────
function StepBreadcrumb({ step }: { step: string }) {
  const steps = [
    { id: 'setup', label: 'Setup' },
    { id: 'play',  label: 'Play'  },
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

export function AppShell() {
  const { user, loading, signOut } = useAuth()
  const { state, dispatch } = useStory()
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('dashboard')

  // ── Loading ────────────────────────────────────────────────────────────────
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

  // Sidebar nav items
  const navItems: { id: SidebarTab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stories',   label: 'Stories',   icon: Library          },
    { id: 'settings',  label: 'Settings',  icon: Settings         },
  ]

  return (
    <div className="flex h-screen bg-[#1A1A3E] overflow-hidden">

      {/* ── Fixed sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-16 shrink-0 flex flex-col items-center py-4 bg-[#12122A] border-r border-[#3D3D7A] z-30">
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center">
          <div className="w-9 h-9 rounded-xl bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[#F5A623]" />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col items-center gap-1 flex-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              title={label}
              onClick={() => {
                setSidebarTab(id)
                // If currently in a story step, reset back to dashboard view
                if (state.step !== 'dashboard') dispatch({ type: 'RESET' })
              }}
              className={`group relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                sidebarTab === id && state.step === 'dashboard'
                  ? 'bg-[#F5A623]/20 text-[#F5A623]'
                  : 'text-[#F8F6F0]/30 hover:text-[#F8F6F0]/70 hover:bg-[#2D2D5E]/60'
              }`}
            >
              <Icon className="w-5 h-5" />
              {/* Tooltip */}
              <span className="absolute left-14 px-2 py-1 bg-[#2D2D5E] border border-[#3D3D7A] rounded-lg text-xs text-[#F8F6F0]/80 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {label}
              </span>
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <button
          title="Sign out"
          onClick={signOut}
          className="w-11 h-11 rounded-xl flex items-center justify-center text-[#F8F6F0]/20 hover:text-red-400/70 hover:bg-[#2D2D5E]/60 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </aside>

      {/* ── Main scrollable area ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Story workflow steps take over the main area */}
        {state.step === 'play'   && <PlayStep />}
        {state.step === 'review' && <ReviewStep />}

        {/* Dashboard view (dashboard/stories/settings tabs) */}
        {state.step === 'dashboard' && (
          <>
            {sidebarTab === 'dashboard' && <DashboardTab />}
            {sidebarTab === 'stories'   && <StoriesTab />}
            {sidebarTab === 'settings'  && <SettingsTab />}
          </>
        )}

        {/* Step breadcrumb overlay (top-right when in story workflow) */}
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

      {/* ── SetupStep as modal overlay ───────────────────────────────────────── */}
      {state.step === 'setup' && <SetupStep />}
    </div>
  )
}
