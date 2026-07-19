import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-[#F8F6F0]/80">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'w-full px-3 py-2 rounded-lg bg-[#1A1A3E] border border-[#3D3D7A] text-[#F8F6F0] placeholder:text-[#F8F6F0]/30 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-[#F5A623]/50 focus:border-[#F5A623]/60 transition-colors',
            error && 'border-red-500 focus:ring-red-400/40',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
