'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

const Tooltip = ({ children, content, className }: TooltipProps) => (
  <span className={cn('group relative inline-block', className)}>
    {children}
    <span
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow ring-1 ring-border transition-opacity group-hover:block group-hover:opacity-100"
    >
      {content}
    </span>
  </span>
)

export { Tooltip }
