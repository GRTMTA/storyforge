import { Button } from '@/components/ui/Button'
import {
  BookOpen, Users, Wand2, Shield, Sparkles,
} from 'lucide-react'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-[#F5A623]/10 border border-[#F5A623]/20 flex items-center justify-center">
        <Icon className="w-10 h-10 text-[#F5A623]/50" />
      </div>
      <div className="max-w-xs">
        <h3 className="text-lg font-bold text-[#F8F6F0] mb-2">{title}</h3>
        <p className="text-sm text-[#F8F6F0]/45 leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <Sparkles className="w-4 h-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

// ── Specific empty states ─────────────────────────────────────────────────────

export function EmptyStories({ onNew }: { onNew: () => void }) {
  return (
    <EmptyState
      icon={BookOpen}
      title="No stories yet"
      description="Your library is empty. Start your first story and let the AI co-write your adventure."
      actionLabel="Start First Story"
      onAction={onNew}
    />
  )
}

export function EmptyCharacters({ onNew }: { onNew: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No characters yet"
      description="Characters breathe life into your story. Create your first character to get started."
      actionLabel="Create First Character"
      onAction={onNew}
    />
  )
}

export function EmptyScenes({ onGenerate }: { onGenerate: () => void }) {
  return (
    <EmptyState
      icon={Wand2}
      title="No scenes yet"
      description="Generate your opening scene and begin weaving your narrative."
      actionLabel="Generate First Scene"
      onAction={onGenerate}
    />
  )
}

export function EmptyGuardrails({ onNew }: { onNew: () => void }) {
  return (
    <EmptyState
      icon={Shield}
      title="No guardrails set"
      description="Guardrails keep your story on track. Add rules to guide the AI's direction."
      actionLabel="Add First Guardrail"
      onAction={onNew}
    />
  )
}
