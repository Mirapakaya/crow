import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border border-transparent bg-[var(--accent)] text-[var(--accent-fg)]',
        secondary: 'border border-transparent bg-[var(--surface-2)] text-[var(--text-muted)]',
        destructive: 'border border-transparent bg-[var(--danger)] text-[var(--danger-fg)]',
        outline: 'border border-[var(--border)] text-[var(--text-muted)] bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
