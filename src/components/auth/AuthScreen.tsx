import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  BookOpen, Eye, EyeOff, Mail, Lock, User, CheckCircle, Sparkles,
  ArrowRight, GitBranch, Wand2, BookMarked,
} from 'lucide-react'

// ── Password strength ─────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length === 0) return { score: 0, label: '', color: '' }
  let score = 0
  if (pw.length >= 8)                      score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) || /[^a-zA-Z0-9]/.test(pw)) score++
  const map: Record<number, { label: string; color: string }> = {
    1: { label: 'Weak',   color: '#ef4444' },
    2: { label: 'Fair',   color: '#f59e0b' },
    3: { label: 'Strong', color: '#10b981' },
  }
  return { score: score as 0 | 1 | 2 | 3, ...(map[score] ?? { label: '', color: '' }) }
}

// ── Field component ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  icon: React.ElementType
  error?: string
  autoComplete?: string
  required?: boolean
  suffix?: React.ReactNode
}

function Field({ label, type = 'text', value, onChange, placeholder, icon: Icon, error, autoComplete, required, suffix }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-[#F8F6F0]/70">{label}</label>
      <div className={`relative flex items-center rounded-xl border transition-all duration-150 ${
        error
          ? 'border-red-500/70 bg-red-500/5'
          : 'border-[#3D3D7A] bg-[#2D2D5E]/50 focus-within:border-[#F5A623]/70 focus-within:bg-[#2D2D5E]/80'
      }`}>
        <Icon className="w-4.5 h-4.5 text-[#F8F6F0]/25 absolute left-4 shrink-0" />
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="flex-1 bg-transparent text-[#F8F6F0] placeholder-[#F8F6F0]/20 focus:outline-none py-3.5 pl-11 pr-4 text-base"
        />
        {suffix}
      </div>
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  )
}

// ── Custom checkbox ────────────────────────────────────────────────────────────

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group select-none">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150 ${
          checked
            ? 'bg-[#F5A623] border-[#F5A623]'
            : 'border-[#3D3D7A] bg-transparent group-hover:border-[#F5A623]/50'
        }`}
      >
        {checked && <CheckCircle className="w-3 h-3 text-[#1A1A3E]" />}
      </button>
      <span className="text-sm text-[#F8F6F0]/60 leading-snug">{children}</span>
    </label>
  )
}

// ── Left branding panel ────────────────────────────────────────────────────────

function BrandPanel() {
  const features = [
    { icon: GitBranch, text: 'Branch your story into infinite paths' },
    { icon: Wand2,     text: 'AI-powered scene generation in seconds' },
    { icon: BookMarked,text: 'Save, revisit, and reimagine any moment' },
  ]

  return (
    <div className="relative flex flex-col justify-between h-full p-10 lg:p-14 overflow-hidden select-none">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#12122A] via-[#1A1A3E] to-[#2D1B69]" />
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#F5A623]/8 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-[#7c3aed]/12 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 w-64 h-64 rounded-full bg-[#F5A623]/5 blur-2xl" />
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F8F6F0" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Decorative branch graph */}
        <svg className="absolute bottom-32 right-0 w-64 h-64 opacity-10" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="20"  r="6" fill="#F5A623"/>
          <circle cx="100" cy="80"  r="6" fill="#F5A623"/>
          <circle cx="60"  cy="140" r="6" fill="#60a5fa"/>
          <circle cx="140" cy="140" r="6" fill="#a78bfa"/>
          <circle cx="60"  cy="190" r="5" fill="#34d399"/>
          <circle cx="140" cy="190" r="5" fill="#f472b6"/>
          <line x1="100" y1="20"  x2="100" y2="80"  stroke="#F5A623" strokeWidth="2" strokeDasharray="4 3" opacity="0.6"/>
          <line x1="100" y1="80"  x2="60"  y2="140" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
          <line x1="100" y1="80"  x2="140" y2="140" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
          <line x1="60"  y1="140" x2="60"  y2="190" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
          <line x1="140" y1="140" x2="140" y2="190" stroke="#f472b6" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
        </svg>
      </div>

      {/* Content (relative above backgrounds) */}
      <div className="relative">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#F5A623]/20 border border-[#F5A623]/30 flex items-center justify-center">
            <BookOpen className="w-5.5 h-5.5 text-[#F5A623]" />
          </div>
          <span className="text-2xl font-bold text-[#F8F6F0] tracking-tight">Scribis</span>
        </div>
      </div>

      {/* Centre content */}
      <div className="relative flex flex-col gap-8">
        <div>
          <h2 className="text-4xl lg:text-5xl font-bold text-[#F8F6F0] leading-tight mb-4">
            Craft stories that{' '}
            <span className="text-[#F5A623]">branch beyond</span>{' '}
            imagination.
          </h2>
          <p className="text-[#F8F6F0]/55 text-lg leading-relaxed max-w-sm">
            AI-powered interactive narratives with branching paths, living characters, and infinite possibilities.
          </p>
        </div>

        {/* Feature list */}
        <div className="flex flex-col gap-4">
          {features.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#F5A623]/15 border border-[#F5A623]/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#F5A623]" />
              </div>
              <span className="text-[#F8F6F0]/70 text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom quote */}
      <div className="relative">
        <p className="text-[#F8F6F0]/30 text-xs italic">
          "Every choice creates a new world."
        </p>
      </div>
    </div>
  )
}

// ── Main AuthScreen ────────────────────────────────────────────────────────────

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')

  // Shared fields
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')

  // Sign-up only fields
  const [name,       setName]       = useState('')
  const [confirmPw,  setConfirmPw]  = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)

  // UI state
  const [showPw,      setShowPw]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState(false)

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  const strength = getPasswordStrength(password)

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next)
    setEmail('')
    setPassword('')
    setName('')
    setConfirmPw('')
    setAcceptTerms(false)
    setErrors({})
    setServerError(null)
    setShowPw(false)
    setShowConfirm(false)
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (mode === 'signup' && name.trim().length < 2)
      errs.name = 'Name must be at least 2 characters'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'Enter a valid email address'
    if (password.length < 8)
      errs.password = 'Password must be at least 8 characters'
    if (mode === 'signup' && password !== confirmPw)
      errs.confirmPw = 'Passwords do not match'
    if (mode === 'signup' && !acceptTerms)
      errs.terms = 'You must accept the terms to continue'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setServerError(null)
    const { error } = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password)
    setLoading(false)
    if (error) {
      setServerError(error)
    } else if (mode === 'signup') {
      setSuccess(true)
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex bg-[#1A1A3E]">
        {/* Left panel hidden on success for simplicity */}
        <div className="hidden lg:flex lg:w-[55%]">
          <BrandPanel />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-9 h-9 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-bold text-[#F8F6F0] mb-3">Check your email</h2>
            <p className="text-[#F8F6F0]/55 mb-2 leading-relaxed">
              We sent a confirmation link to
            </p>
            <p className="text-[#F5A623] font-semibold text-lg mb-8">{email}</p>
            <p className="text-[#F8F6F0]/40 text-sm mb-6">
              Click the link in the email to activate your account, then sign in.
            </p>
            <button
              onClick={() => { setSuccess(false); switchMode('signin') }}
              className="inline-flex items-center gap-2 text-[#F5A623] hover:text-[#F7C05A] font-medium transition-colors cursor-pointer"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex bg-[#1A1A3E]">

      {/* ── Left: Branding panel (hidden on mobile, shown lg+) ──────────── */}
      <div className="hidden lg:flex lg:w-[55%] shrink-0">
        <BrandPanel />
      </div>

      {/* ── Right: Form panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 overflow-y-auto">

        {/* Mobile logo (only on small screens where left panel is hidden) */}
        <div className="flex lg:hidden items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-[#F5A623]/20 border border-[#F5A623]/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[#F5A623]" />
          </div>
          <span className="text-xl font-bold text-[#F8F6F0]">Scribis</span>
        </div>

        <div className="w-full max-w-md">

          {/* ── Form header ─────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#F8F6F0] mb-2">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-[#F8F6F0]/50">
              {mode === 'signin'
                ? 'Enter your credentials to continue your story'
                : 'Start your storytelling journey today'}
            </p>
          </div>

          {/* ── Server error ─────────────────────────────────────────────── */}
          {serverError && (
            <div className="mb-6 px-4 py-3 bg-red-500/12 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {serverError}
            </div>
          )}

          {/* ── Form ─────────────────────────────────────────────────────── */}
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            {/* Name — signup only */}
            {mode === 'signup' && (
              <Field
                label="Full Name"
                value={name}
                onChange={setName}
                placeholder="Your name"
                icon={User}
                error={errors.name}
                autoComplete="name"
                required
              />
            )}

            {/* Email */}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              icon={Mail}
              error={errors.email}
              autoComplete="email"
              required
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#F8F6F0]/70">Password</label>
              <div className={`relative flex items-center rounded-xl border transition-all duration-150 ${
                errors.password
                  ? 'border-red-500/70 bg-red-500/5'
                  : 'border-[#3D3D7A] bg-[#2D2D5E]/50 focus-within:border-[#F5A623]/70 focus-within:bg-[#2D2D5E]/80'
              }`}>
                <Lock className="w-4 h-4 text-[#F8F6F0]/25 absolute left-4" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  className="flex-1 bg-transparent text-[#F8F6F0] placeholder-[#F8F6F0]/20 focus:outline-none py-3.5 pl-11 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 text-[#F8F6F0]/30 hover:text-[#F8F6F0]/70 transition-colors cursor-pointer"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-0.5">{errors.password}</p>}

              {/* Strength indicator — signup only */}
              {mode === 'signup' && password.length > 0 && (
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex gap-1 flex-1">
                    {([1, 2, 3] as const).map(n => (
                      <div
                        key={n}
                        className="h-1 flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: strength.score >= n ? strength.color : '#3D3D7A',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs shrink-0" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password — signup only */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#F8F6F0]/70">Confirm Password</label>
                <div className={`relative flex items-center rounded-xl border transition-all duration-150 ${
                  errors.confirmPw
                    ? 'border-red-500/70 bg-red-500/5'
                    : 'border-[#3D3D7A] bg-[#2D2D5E]/50 focus-within:border-[#F5A623]/70 focus-within:bg-[#2D2D5E]/80'
                }`}>
                  <Lock className="w-4 h-4 text-[#F8F6F0]/25 absolute left-4" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="flex-1 bg-transparent text-[#F8F6F0] placeholder-[#F8F6F0]/20 focus:outline-none py-3.5 pl-11 pr-12 text-base"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-4 text-[#F8F6F0]/30 hover:text-[#F8F6F0]/70 transition-colors cursor-pointer"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPw && <p className="text-xs text-red-400 mt-0.5">{errors.confirmPw}</p>}
                {!errors.confirmPw && confirmPw.length > 0 && confirmPw === password && (
                  <p className="text-xs text-emerald-400 mt-0.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Passwords match
                  </p>
                )}
              </div>
            )}

            {/* Signin options row */}
            {mode === 'signin' && (
              <div className="flex items-center justify-between -mt-1">
                <span className="text-sm text-[#F8F6F0]/40">
                  {/* Placeholder for "Remember me" — omitted for MVP */}
                </span>
                <button
                  type="button"
                  className="text-sm text-[#F5A623]/80 hover:text-[#F5A623] transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Terms — signup only */}
            {mode === 'signup' && (
              <div>
                <Checkbox checked={acceptTerms} onChange={setAcceptTerms}>
                  I agree to the{' '}
                  <span className="text-[#F5A623]">Terms of Service</span>
                  {' '}and{' '}
                  <span className="text-[#F5A623]">Privacy Policy</span>
                </Checkbox>
                {errors.terms && <p className="text-xs text-red-400 mt-1.5">{errors.terms}</p>}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 bg-[#F5A623] hover:bg-[#F7C05A] active:bg-[#C4841A] text-[#1A1A3E] font-bold text-base py-4 rounded-xl transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/60"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Processing…
                </>
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* ── Toggle mode ──────────────────────────────────────────────── */}
          <p className="text-center text-[#F8F6F0]/40 text-sm mt-7">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              className="text-[#F5A623] hover:text-[#F7C05A] font-medium transition-colors cursor-pointer"
            >
              {mode === 'signin' ? 'Sign up for free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
