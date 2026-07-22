import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * VerifyEmail — handles the Supabase email confirmation redirect.
 *
 * Supabase appends #access_token=...&type=signup (or type=recovery) to the
 * redirect URL. We exchange it via onAuthStateChange / exchangeCodeForSession
 * and then show a success or error state.
 */
export function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // Supabase PKCE flow: the URL may contain a `code` param (newer) or a
    // hash fragment with tokens (older implicit flow).
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const errorParam = url.searchParams.get('error_description') ?? url.searchParams.get('error')

    if (errorParam) {
      setErrorMsg(errorParam)
      setStatus('error')
      return
    }

    if (code) {
      // PKCE flow — exchange code for session
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          if (error) {
            setErrorMsg(error.message)
            setStatus('error')
          } else {
            setStatus('success')
          }
        })
      return
    }

    // Implicit / token-in-hash flow — onAuthStateChange handles it automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setStatus('success')
        subscription.unsubscribe()
      }
    })

    // Timeout fallback — if no event fires the hash was invalid or missing
    const timer = setTimeout(() => {
      if (status === 'loading') {
        setErrorMsg('Verification link may have expired or already been used.')
        setStatus('error')
      }
    }, 6000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goToDashboard = () => {
    window.location.href = '/app'
  }

  return (
    <div className="min-h-screen bg-[#1A1A3E] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-12">
        <img src="/logo-scribis.png" alt="Scribis" width={40} height={40}
          style={{ objectFit: 'contain' }} />
        <span className="text-xl font-bold text-[#F8F6F0]">Scribis</span>
      </div>

      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 rounded-full bg-[#2D2D5E]/60 border border-[#3D3D7A] flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-9 h-9 text-[#F5A623] animate-spin" />
            </div>
            <h1 className="text-3xl font-bold text-[#F8F6F0] mb-3">Verifying your email…</h1>
            <p className="text-[#F8F6F0]/50 leading-relaxed">
              Please wait while we confirm your email address.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-9 h-9 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-[#F8F6F0] mb-3">Email Verified!</h1>
            <p className="text-[#F8F6F0]/55 leading-relaxed mb-8">
              Your email has been successfully verified.<br />
              You can now sign in and start creating stories.
            </p>
            <button
              onClick={goToDashboard}
              className="inline-flex items-center gap-2 bg-[#F5A623] hover:bg-[#F7C05A] text-[#1A1A3E] font-bold px-8 py-4 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5A623]/60"
            >
              Continue to Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-9 h-9 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-[#F8F6F0] mb-3">Verification Failed</h1>
            <p className="text-[#F8F6F0]/55 leading-relaxed mb-3">
              {errorMsg || 'The confirmation link is invalid or has expired.'}
            </p>
            <p className="text-[#F8F6F0]/35 text-sm mb-8">
              Request a new confirmation email by signing up again or contacting support.
            </p>
            <button
              onClick={goToDashboard}
              className="inline-flex items-center gap-2 border border-[#3D3D7A] text-[#F8F6F0]/70 hover:text-[#F8F6F0] hover:border-[#F5A623]/40 px-8 py-4 rounded-xl transition-colors cursor-pointer font-medium"
            >
              <ArrowRight className="w-4 h-4 rotate-180" /> Back to Sign In
            </button>
          </>
        )}
      </div>
    </div>
  )
}
