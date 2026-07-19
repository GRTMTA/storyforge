import { useAuth } from '@/contexts/AuthContext'
import { User, Mail, Shield, ExternalLink } from 'lucide-react'

export function SettingsTab() {
  const { user } = useAuth()

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#F8F6F0] mb-1">Settings</h1>
        <p className="text-[#F8F6F0]/40 text-sm">Manage your account and preferences</p>
      </div>

      {/* Account */}
      <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#3D3D7A]">
          <h2 className="text-sm font-semibold text-[#F8F6F0]/80">Account</h2>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#F5A623]/15 border border-[#F5A623]/30 flex items-center justify-center">
              <User className="w-7 h-7 text-[#F5A623]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#F8F6F0]">
                {user?.email?.split('@')[0] ?? 'Anonymous'}
              </p>
              <p className="text-xs text-[#F8F6F0]/40 flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3" />
                {user?.email ?? '—'}
              </p>
            </div>
          </div>

          {/* User ID */}
          <div className="flex items-center justify-between py-3 border-t border-[#3D3D7A]">
            <span className="text-xs text-[#F8F6F0]/40">User ID</span>
            <span className="text-xs text-[#F8F6F0]/50 font-mono">{user?.id?.slice(0, 16)}…</span>
          </div>

          {/* Auth provider */}
          <div className="flex items-center justify-between py-3 border-t border-[#3D3D7A]">
            <span className="text-xs text-[#F8F6F0]/40">Auth Provider</span>
            <span className="text-xs text-[#F8F6F0]/50">Email / Password</span>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#3D3D7A]">
          <h2 className="text-sm font-semibold text-[#F8F6F0]/80 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#F5A623]" /> Privacy &amp; Data
          </h2>
        </div>
        <div className="px-6 py-5 flex flex-col gap-3">
          <p className="text-xs text-[#F8F6F0]/40 leading-relaxed">
            Your stories are stored privately in Supabase and are never shared with third parties.
            AI generation uses the Groq API — prompts may include your story content to generate responses.
          </p>
          <a
            href="https://supabase.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#F5A623]/60 hover:text-[#F5A623] transition-colors"
          >
            Supabase Privacy Policy <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* About */}
      <div className="bg-[#2D2D5E]/40 border border-[#3D3D7A] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#3D3D7A]">
          <h2 className="text-sm font-semibold text-[#F8F6F0]/80">About StoryForge</h2>
        </div>
        <div className="px-6 py-5 flex flex-col gap-2">
          {[
            { label: 'Version',  value: '0.1.0 (MVP)'        },
            { label: 'AI Model', value: 'Groq llama-3.3-70b' },
            { label: 'Database', value: 'Supabase PostgreSQL' },
            { label: 'Frontend', value: 'React 18 + Tailwind' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-[#3D3D7A]/40 last:border-0">
              <span className="text-xs text-[#F8F6F0]/40">{label}</span>
              <span className="text-xs text-[#F8F6F0]/60">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
