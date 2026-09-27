import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1 text-sm text-text shadow-xs transition-[color,border-color,box-shadow] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-text-muted placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-[var(--ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[var(--ring-offset)] focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }
