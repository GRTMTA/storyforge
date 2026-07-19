import { useStory } from '@/contexts/StoryContext'
import { useAuth } from '@/contexts/AuthContext'
import { AuthScreen } from '@/components/auth/AuthScreen'
import { Dashboard } from '@/components/dashboard/Dashboard'
import { SetupStep } from '@/components/setup/SetupStep'
import { PlayStep } from '@/components/play/PlayStep'
import { ReviewStep } from '@/components/review/ReviewStep'
import { BookOpen, LogOut, LayoutDashboard } from 'lucide-react'

function StepIndicator({ current }: { current: string }) {
  const steps = [
    { id: 'setup', label: 'Setup' },
    { id: 'play', label: 'Play' },
    { id: 'review', label: 'Review' },
  ]
  // dashboard step has no indicator
  if (current === 'dashboard') return null
  const idx = steps.findIndex(s => s.id === current)
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center gap-1">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < idx
                ? 'bg-[#F5A623] text-[#1A1A3E]'
                : i === idx
                ? 'bg-[#F5A623]/20 text-[#F5A623] border border-[#F5A623]'
                : 'bg-[#2D2D5E] text-[#F8F6F0]/30 border border-[#3D3D7A]'
            }`}
          >
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`text-xs hidden sm:block ${
            i === idx ? 'text-[#F8F6F0]' : 'text-[#F8F6F0]/30'
          }`}>{step.label}</span>
          {i < steps.length - 1 && (
            <div className={`w-6 h-0.5 ${i < idx ? 'bg-[#F5A623]' : 'bg-[#3D3D7A]'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

function NavBar() {
  const { user, signOut } = useAuth()
  const { state, dispatch } = useStory()

  return (
    <nav className="sticky top-0 z-40 bg-[#1A1A3E]/90 backdrop-blur border-b border-[#3D3D7A]">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <BookOpen className="w-5 h-5 text-[#F5A623]" />
          <span className="font-bold text-[#F8F6F0]">StoryForge</span>
        </button>
        <StepIndicator current={state.step} />
        <div className="flex items-center gap-3">
          {user && state.step !== 'dashboard' && (
            <button
              onClick={() => dispatch({ type: 'RESET' })}
              className="p-1.5 rounded-lg text-[#F8F6F0]/40 hover:text-[#F8F6F0] hover:bg-[#2D2D5E] transition-colors cursor-pointer"
              title="My stories"
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
          )}
          {user && (
            <>
              <span className="text-xs text-[#F8F6F0]/40 hidden sm:block truncate max-w-36">
                {user.email}
              </span>
              <button
                onClick={signOut}
                className="p-1.5 rounded-lg text-[#F8F6F0]/40 hover:text-[#F8F6F0] hover:bg-[#2D2D5E] transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export function AppShell() {
  const { user, loading } = useAuth()
  const { state } = useStory()

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

  return (
    <>
      <NavBar />
      {state.step === 'dashboard' && <Dashboard />}
      {state.step === 'setup' && <SetupStep />}
      {state.step === 'play' && <PlayStep />}
      {state.step === 'review' && <ReviewStep />}
    </>
  )
}
