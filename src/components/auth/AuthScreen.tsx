import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BookOpen, Sparkles } from 'lucide-react'

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)

    setLoading(false)
    if (error) {
      setError(error)
    } else if (mode === 'signup') {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1A3E] px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-[#F8F6F0] mb-2">Check your email</h2>
          <p className="text-[#F8F6F0]/60 mb-6">We sent a confirmation link to <strong className="text-[#F5A623]">{email}</strong></p>
          <Button variant="outline" onClick={() => { setSuccess(false); setMode('signin') }}>
            Back to sign in
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1A3E] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#F5A623]/20 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#F5A623]" />
            </div>
            <span className="text-3xl font-bold text-[#F8F6F0]">StoryForge</span>
          </div>
          <p className="text-[#F8F6F0]/50 text-sm">AI-powered interactive narrative generation</p>
        </div>

        {/* Card */}
        <div className="bg-[#2D2D5E]/50 border border-[#3D3D7A] rounded-2xl p-6">
          <h2 className="text-xl font-bold text-[#F8F6F0] mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="text-[#F8F6F0]/50 text-sm mb-6">
            {mode === 'signin' ? 'Sign in to continue your story' : 'Start forging your narrative'}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              error={error ?? undefined}
            />
            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </div>

        <p className="text-center text-[#F8F6F0]/40 text-sm mt-4">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            className="text-[#F5A623] hover:text-[#F7C05A] underline"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null) }}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
