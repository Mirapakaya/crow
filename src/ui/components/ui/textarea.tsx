import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[60px] w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text shadow-xs placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-[var(--ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[var(--ring-offset)] focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
