'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Sheet = ({ children }: SheetProps) => children

const SheetTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ ...props }, ref) => (
  <button ref={ref} type="button" {...props} />
))
SheetTrigger.displayName = 'SheetTrigger'

const SheetContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { side?: 'left' | 'right' | 'top' | 'bottom' }>(
  ({ className, side = 'right', children, ...props }, ref) => {
    const sideClasses =
      side === 'left'
        ? 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm'
        : side === 'right'
          ? 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm'
          : side === 'top'
            ? 'inset-x-0 top-0 h-auto w-full border-b'
            : 'inset-x-0 bottom-0 h-auto w-full border-t'
    return (
      <div
        ref={ref}
        className={cn('fixed z-50 bg-background p-6 shadow-lg', sideClasses, className)}
        {...props}
      >
        {children}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onClick={() => {} }
          aria-label="Close"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    )
  },
)
SheetContent.displayName = 'SheetContent'

export { Sheet, SheetTrigger, SheetContent, Dialog as SheetPrimitive, DialogHeader, DialogTitle, DialogDescription }
