import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-[var(--control-md)] w-full appearance-none rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 pr-8 text-sm text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-1 focus:ring-offset-[var(--bg)] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Select.displayName = 'Select'

export { Select }
