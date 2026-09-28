import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  horizontal?: boolean
}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(({ className, horizontal, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('relative overflow-hidden', horizontal ? 'overflow-x-auto' : 'overflow-y-auto', className)}
    {...props}
  >
    {children}
  </div>
))
ScrollArea.displayName = 'ScrollArea'

export { ScrollArea }
