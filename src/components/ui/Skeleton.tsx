import { cn } from '@/lib/utils'

// ── Base skeleton block ───────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[#2D2D5E]/60',
        className,
      )}
    />
  )
}

// ── Story card skeleton ───────────────────────────────────────────────────────
export function StoryCardSkeleton() {
  return (
    <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-5 w-3/5" />
          <div className="flex gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2 mt-1">
        <Skeleton className="flex-1 h-9 rounded-xl" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
    </div>
  )
}

// ── Character card skeleton ───────────────────────────────────────────────────
export function CharacterCardSkeleton() {
  return (
    <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-1.5 flex-wrap">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-18 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  )
}

// ── Scene card skeleton ───────────────────────────────────────────────────────
export function SceneCardSkeleton() {
  return (
    <div className="bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-6 w-2/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  )
}

// ── Scene choice skeleton ─────────────────────────────────────────────────────
export function ChoiceSkeleton() {
  return (
    <div className="p-4 bg-[#2D2D5E]/30 border border-[#3D3D7A] rounded-xl flex items-start gap-3">
      <Skeleton className="w-7 h-7 rounded-lg shrink-0 mt-0.5" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}

// ── Generating scene skeleton (mimics full scene + choices) ───────────────────
export function GeneratingSceneSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <SceneCardSkeleton />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-28 rounded" />
        <ChoiceSkeleton />
        <ChoiceSkeleton />
        <ChoiceSkeleton />
      </div>
    </div>
  )
}

// ── Dashboard list skeleton ───────────────────────────────────────────────────
export function DashboardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[#3D3D7A]/50">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton className="h-4 w-2/5" />
              <div className="flex gap-2">
                <Skeleton className="h-3.5 w-14 rounded-full" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}
