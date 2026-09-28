import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        className={cn(
          'h-4 w-4 shrink-0 cursor-pointer rounded border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--accent)] accent-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
