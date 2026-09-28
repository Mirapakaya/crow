import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value = 0, max = 100, ...props }, ref) => {
  const safeValue = Math.max(0, Math.min(value, max))
  return (
    <div
      ref={ref}
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]',
        className,
      )}
      {...props}
    >
      <div
        className="h-full bg-[var(--accent)] transition-all duration-300"
        style={{ width: `${(safeValue / max) * 100}%` }}
      />
    </div>
  )
})
Progress.displayName = 'Progress'

export { Progress }
