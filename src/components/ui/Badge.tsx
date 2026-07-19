import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'gold' | 'success' | 'warning' | 'danger'

const variants: Record<BadgeVariant, string> = {
  default: 'bg-[#3D3D7A]/60 text-[#F8F6F0]/80 border border-[#3D3D7A]',
  gold: 'bg-[#F5A623]/15 text-[#F5A623] border border-[#F5A623]/30',
  success: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  danger: 'bg-red-500/15 text-red-400 border border-red-500/30',
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
