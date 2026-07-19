import { useAuth } from '@/contexts/AuthContext'
import { User, Mail, Shield, ExternalLink } from 'lucide-react'

export function SettingsTab() {
  const { user } = useAuth()

  return (
    <div className="px-10 py-10 w-full">

      {/* Title */}
      <h1 className="text-4xl font-bold text-[#F8F6F0] mb-2">Settings</h1>
      <p className="text-[#F8F6F0]/50 text-lg mb-12">Manage your account and preferences</p>

      {/* ── Account ─────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-[#F8F6F0]/80 mb-6 pb-3 border-b border-[#3D3D7A]">
          Account
        </h2>

        {/* Avatar + name */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 rounded-2xl bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center shrink-0">
            <User className="w-10 h-10 text-[#F5A623]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#F8F6F0]">
              {user?.email?.split('@')[0] ?? 'Anonymous'}
            </p>
            <p className="text-base text-[#F8F6F0]/40 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {user?.email ?? '—'}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col divide-y divide-[#3D3D7A]/50">
          <div className="flex items-center justify-between py-4">
            <span className="text-base text-[#F8F6F0]/50">User ID</span>
            <span className="text-base text-[#F8F6F0]/70 font-mono">{user?.id?.slice(0, 20)}…</span>
          </div>
          <div className="flex items-center justify-between py-4">
            <span className="text-base text-[#F8F6F0]/50">Auth Provider</span>
            <span className="text-base text-[#F8F6F0]/70">Email / Password</span>
          </div>
        </div>
      </section>

      {/* ── Privacy & Data ──────────────────────────────────────────────────── */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold text-[#F8F6F0]/80 mb-6 pb-3 border-b border-[#3D3D7A] flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#F5A623]" /> Privacy &amp; Data
        </h2>
        <p className="text-base text-[#F8F6F0]/50 leading-relaxed mb-4 max-w-2xl">
          Your stories are stored privately in Supabase and are never shared with third parties.
          AI generation uses the Groq API — prompts may include your story content to generate responses.
        </p>
        <a
          href="https://supabase.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-base text-[#F5A623]/70 hover:text-[#F5A623] transition-colors"
        >
          Supabase Privacy Policy <ExternalLink className="w-4 h-4" />
        </a>
      </section>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-semibold text-[#F8F6F0]/80 mb-6 pb-3 border-b border-[#3D3D7A]">
          About StoryForge
        </h2>
        <div className="flex flex-col divide-y divide-[#3D3D7A]/50">
          {[
            { label: 'Version',  value: '0.1.0 (MVP)'        },
            { label: 'AI Model', value: 'Groq llama-3.3-70b' },
            { label: 'Database', value: 'Supabase PostgreSQL' },
            { label: 'Frontend', value: 'React 19 + Tailwind' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-4">
              <span className="text-base text-[#F8F6F0]/50">{label}</span>
              <span className="text-base text-[#F8F6F0]/70">{value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
