import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex w-full min-h-[var(--control-lg)] rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text)] text-[var(--step-0)] shadow-sm transition-[border-color,box-shadow] file:border-0 file:bg-transparent file:text-[var(--step-0)] file:font-medium placeholder:text-[var(--text-faint)] focus-visible:outline-none focus-visible:border-[var(--accent)] focus-visible:ring-[var(--ring-width)] focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50',
        props['aria-invalid'] && 'border-[var(--danger)] focus-visible:ring-[var(--danger-soft)]',
        className,
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = 'Input'

export { Input }
