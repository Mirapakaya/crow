import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex w-full min-h-[5rem] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text)] text-[var(--step-0)] leading-[var(--leading-snug)] shadow-sm transition-[border-color,box-shadow] placeholder:text-[var(--text-faint)] focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-[var(--ring-width)] focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50 resize-vertical',
        props['aria-invalid'] && 'border-[var(--danger)] focus-visible:ring-[var(--danger-soft)]',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
