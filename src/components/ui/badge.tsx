import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-[0.3em] rounded-[var(--radius-full)] border border-transparent px-[var(--space-2)] py-[0.1rem] text-[var(--step--1)] font-[var(--weight-medium)] whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
        success: 'bg-[var(--success-soft)] text-[var(--success)]',
        warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
        danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
        accent: 'bg-[var(--accent-soft)] text-[var(--accent-text)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
